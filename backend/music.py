import os
import json
import time
import logging
from collections import OrderedDict

logger = logging.getLogger(__name__)

_CATALOG_TTL = 300
_PRESIGN_TTL = 3600
_ART_CACHE_SIZE = 200

# Play-count persistence: one small JSON object in R2 (plays.json) holding
# per-day, per-track counts plus all-time totals. Reads are served from a
# write-through in-memory copy; every record_play PUTs the full object back
# (traffic is personal-site scale, so read-modify-write races are acceptable).
_PLAYS_KEY = "plays.json"
_PLAYS_REFRESH = 300          # re-pull from R2 occasionally (other workers)
_PLAYS_RETENTION_DAYS = 60    # prune day buckets older than this (30d stat + slack)

_cache: dict = {}
_art_cache: OrderedDict = OrderedDict()
_plays: dict | None = None
_plays_ts = 0.0
_s3 = None
_s3_failed = False


def _get_client():
    global _s3, _s3_failed
    if _s3_failed:
        return None
    if _s3 is not None:
        return _s3

    account_id = os.getenv("R2_ACCOUNT_ID", "")
    access_key = os.getenv("R2_ACCESS_KEY_ID", "")
    secret_key = os.getenv("R2_SECRET_ACCESS_KEY", "")
    if not account_id or not access_key or not secret_key:
        logger.warning("R2 credentials missing: account=%s key=%s secret=%s",
                       bool(account_id), bool(access_key), bool(secret_key))
        _s3_failed = True
        return None

    import boto3
    _s3 = boto3.client(
        "s3",
        endpoint_url=f"https://{account_id}.r2.cloudflarestorage.com",
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        region_name="auto",
    )
    return _s3


def get_catalog() -> dict | None:
    now = time.time()
    entry = _cache.get("catalog")
    if entry and now - entry["ts"] < _CATALOG_TTL:
        return entry["val"]

    client = _get_client()
    if client is None:
        return None
    bucket = os.getenv("R2_BUCKET", "")
    try:
        obj = client.get_object(Bucket=bucket, Key="catalog.json")
        catalog = json.loads(obj["Body"].read())
    except Exception:
        logger.exception("failed to fetch catalog.json from R2")
        # Serve a stale catalog over an error if we have one
        return entry["val"] if entry else None
    _cache["catalog"] = {"val": catalog, "ts": now}
    return catalog


def get_stream_url(track_id: str) -> str | None:
    catalog = get_catalog()
    if not catalog:
        return None
    track = next((t for t in catalog.get("tracks", []) if t["id"] == track_id), None)
    if track is None:
        return None
    client = _get_client()
    if client is None:
        return None
    return client.generate_presigned_url(
        "get_object",
        Params={"Bucket": os.getenv("R2_BUCKET", ""), "Key": f"tracks/{track_id}.{track['ext']}"},
        ExpiresIn=_PRESIGN_TTL,
    )


def _load_plays(force: bool = False) -> dict:
    global _plays, _plays_ts
    now = time.time()
    if _plays is not None and not force and now - _plays_ts < _PLAYS_REFRESH:
        return _plays

    client = _get_client()
    if client is not None:
        try:
            obj = client.get_object(Bucket=os.getenv("R2_BUCKET", ""), Key=_PLAYS_KEY)
            _plays = json.loads(obj["Body"].read())
            _plays_ts = now
            return _plays
        except Exception:
            # First run (no plays.json yet) or transient fetch error — fall
            # through to whatever we already have in memory.
            logger.info("plays.json not readable from R2 (first run?)")
    if _plays is None:
        _plays = {"all_time": {}, "days": {}}
    _plays_ts = now
    return _plays


def _save_plays(plays: dict) -> None:
    client = _get_client()
    if client is None:
        return
    try:
        client.put_object(
            Bucket=os.getenv("R2_BUCKET", ""),
            Key=_PLAYS_KEY,
            Body=json.dumps(plays).encode(),
            ContentType="application/json",
        )
    except Exception:
        logger.exception("failed to persist plays.json to R2")


def record_play(track_id: str) -> bool:
    """Record one play of a library track. Returns False for unknown tracks."""
    catalog = get_catalog()
    if not catalog or not any(t["id"] == track_id for t in catalog.get("tracks", [])):
        return False

    plays = _load_plays()
    day = time.strftime("%Y-%m-%d", time.gmtime())
    days = plays.setdefault("days", {})
    daily = days.setdefault(day, {})
    daily[track_id] = daily.get(track_id, 0) + 1
    all_time = plays.setdefault("all_time", {})
    all_time[track_id] = all_time.get(track_id, 0) + 1

    cutoff = time.strftime("%Y-%m-%d", time.gmtime(time.time() - _PLAYS_RETENTION_DAYS * 86400))
    for stale in [d for d in days if d < cutoff]:
        del days[stale]

    _save_plays(plays)
    return True


def get_play_stats() -> dict:
    plays = _load_plays()
    cutoff = time.strftime("%Y-%m-%d", time.gmtime(time.time() - 30 * 86400))
    total = sum(
        sum(counts.values())
        for day, counts in plays.get("days", {}).items()
        if day >= cutoff
    )
    return {"plays_30d": total}


def get_art(track_id: str) -> bytes | None:
    """Fetch album art for a track. Returns JPEG bytes or None if unavailable."""
    catalog = get_catalog()
    if not catalog:
        return None
    track = next((t for t in catalog.get("tracks", []) if t["id"] == track_id), None)
    if track is None:
        return None
    if not track.get("has_art", False):
        return None

    # Check cache first
    if track_id in _art_cache:
        _art_cache.move_to_end(track_id)
        return _art_cache[track_id]

    client = _get_client()
    if client is None:
        return None

    bucket = os.getenv("R2_BUCKET", "")
    try:
        obj = client.get_object(Bucket=bucket, Key=f"art/{track_id}.jpg")
        art_bytes = obj["Body"].read()
    except Exception:
        logger.exception(f"failed to fetch art/{track_id}.jpg from R2")
        return None

    # Store in cache (evict oldest if at capacity)
    if len(_art_cache) >= _ART_CACHE_SIZE:
        _art_cache.popitem(last=False)
    _art_cache[track_id] = art_bytes
    return art_bytes
