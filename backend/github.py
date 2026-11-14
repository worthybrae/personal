"""Public GitHub contribution calendar for the about page.

Reads the same HTML fragment github.com renders on a profile
(/users/<name>/contributions), so it needs no token. Cached for an hour.
"""
import re
import time

import httpx

GITHUB_USER = "worthybrae"
_CACHE_TTL = 3600
_cache: dict = {}

_DAY = re.compile(r'data-date="(\d{4}-\d{2}-\d{2})"\s+id="([^"]+)"\s+data-level="(\d)"')
_TIP = re.compile(r'<tool-tip[^>]*\bfor="([^"]+)"[^>]*>\s*(No|\d+) contributions? on')


def get_activity() -> dict:
    now = time.time()
    entry = _cache.get("activity")
    if entry and now - entry["ts"] < _CACHE_TTL:
        return entry["val"]
    try:
        val = _fetch()
    except Exception:
        # Serve the last good copy if GitHub is unreachable.
        return entry["val"] if entry else {"user": GITHUB_USER, "total": 0, "days": []}
    _cache["activity"] = {"val": val, "ts": now}
    return val


def _fetch() -> dict:
    res = httpx.get(
        f"https://github.com/users/{GITHUB_USER}/contributions",
        headers={"User-Agent": "Mozilla/5.0"},
        timeout=10,
    )
    res.raise_for_status()
    html = res.text
    counts = {cid: (0 if n == "No" else int(n)) for cid, n in _TIP.findall(html)}
    days = sorted(
        ({"date": date, "count": counts.get(cid, 0), "level": int(level)} for date, cid, level in _DAY.findall(html)),
        key=lambda d: d["date"],
    )
    return {"user": GITHUB_USER, "total": sum(d["count"] for d in days), "days": days}
