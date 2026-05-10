import re
import time
import feedparser

_cache: dict = {}
_CACHE_TTL = 900  # 15 minutes

LETTERBOXD_RSS = "https://letterboxd.com/stingray7/rss/"

def _cached(key: str, fn):
    now = time.time()
    entry = _cache.get(key)
    if entry and now - entry["ts"] < _CACHE_TTL:
        return entry["val"]
    val = fn()
    _cache[key] = {"val": val, "ts": now}
    return val

def get_recent_films() -> dict:
    return _cached("recent_films", _get_recent_films_impl)

def _get_recent_films_impl() -> dict:
    try:
        feed = feedparser.parse(LETTERBOXD_RSS)
        films = []
        for entry in feed.entries[:5]:
            title_raw = entry.get("title", "")
            title = title_raw
            year = None
            rating = 0.0
            year_match = re.search(r",\s*(\d{4})", title_raw)
            if year_match:
                year = int(year_match.group(1))
                title = title_raw[:year_match.start()].strip()
            star_match = re.search(r"[★½]+", title_raw)
            if star_match:
                stars = star_match.group(0)
                rating = stars.count("★") + (0.5 if "½" in stars else 0.0)
            poster_url = ""
            description = entry.get("summary", "")
            img_match = re.search(r'<img\s+src="([^"]+)"', description)
            if img_match:
                poster_url = img_match.group(1)
            watched_date = ""
            if hasattr(entry, "published"):
                watched_date = entry.published[:10] if len(entry.published) >= 10 else entry.published
            films.append({
                "title": title,
                "year": year,
                "rating": rating,
                "url": entry.get("link", ""),
                "poster_url": poster_url,
                "watched_date": watched_date,
            })
        return {"films": films}
    except Exception:
        return {"films": []}
