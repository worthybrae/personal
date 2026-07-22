import os
import json
import time
import logging
from collections import OrderedDict

logger = logging.getLogger(__name__)

_CATALOG_TTL = 300
_PRESIGN_TTL = 3600
_ART_CACHE_SIZE = 200

_cache: dict = {}
_art_cache: OrderedDict = OrderedDict()
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
