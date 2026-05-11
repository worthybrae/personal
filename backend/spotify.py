import os
import time
import spotipy
from spotipy.oauth2 import SpotifyOAuth

_cache: dict = {}
_NOW_PLAYING_TTL = 30
_TOP_TRACKS_TTL = 300

def _cached(key: str, ttl: int, fn):
    now = time.time()
    entry = _cache.get(key)
    if entry and now - entry["ts"] < ttl:
        return entry["val"]
    val = fn()
    _cache[key] = {"val": val, "ts": now}
    return val

_sp: spotipy.Spotify | None = None

def _get_client() -> spotipy.Spotify:
    global _sp
    if _sp is None:
        auth_manager = SpotifyOAuth(
            client_id=os.getenv("SPOTIFY_CLIENT_ID", ""),
            client_secret=os.getenv("SPOTIFY_CLIENT_SECRET", ""),
            redirect_uri=os.getenv("SPOTIFY_REDIRECT_URI", "http://localhost:8000/api/spotify/callback"),
            scope="user-read-currently-playing user-read-recently-played user-top-read",
            cache_path=os.path.join(os.path.dirname(__file__), ".spotify_cache"),
        )
        _sp = spotipy.Spotify(auth_manager=auth_manager)
    return _sp

def get_now_playing() -> dict:
    return _cached("now_playing", _NOW_PLAYING_TTL, _get_now_playing_impl)

def _get_now_playing_impl() -> dict:
    sp = _get_client()
    try:
        current = sp.current_user_playing_track()
        if current and current.get("item"):
            item = current["item"]
            album_images = item.get("album", {}).get("images", [])
            return {
                "is_playing": current.get("is_playing", False),
                "track": item.get("name", ""),
                "artist": ", ".join(a["name"] for a in item.get("artists", [])),
                "album": item.get("album", {}).get("name", ""),
                "album_art_url": album_images[0]["url"] if album_images else "",
                "progress_ms": current.get("progress_ms", 0),
                "duration_ms": item.get("duration_ms", 0),
            }
    except Exception:
        pass
    try:
        recent = sp.current_user_recently_played(limit=1)
        items = recent.get("items", [])
        if items:
            item = items[0]["track"]
            album_images = item.get("album", {}).get("images", [])
            return {
                "is_playing": False,
                "track": item.get("name", ""),
                "artist": ", ".join(a["name"] for a in item.get("artists", [])),
                "album": item.get("album", {}).get("name", ""),
                "album_art_url": album_images[0]["url"] if album_images else "",
                "progress_ms": 0,
                "duration_ms": item.get("duration_ms", 0),
            }
    except Exception:
        pass
    return {
        "is_playing": False, "track": "", "artist": "", "album": "",
        "album_art_url": "", "progress_ms": 0, "duration_ms": 0,
    }

def get_top_tracks() -> dict:
    return _cached("top_tracks", _TOP_TRACKS_TTL, _get_top_tracks_impl)

def _get_top_tracks_impl() -> dict:
    sp = _get_client()
    try:
        results = sp.current_user_top_tracks(limit=5, time_range="short_term")
        tracks = []
        for item in results.get("items", []):
            album_images = item.get("album", {}).get("images", [])
            tracks.append({
                "track": item.get("name", ""),
                "artist": ", ".join(a["name"] for a in item.get("artists", [])),
                "album_art_url": album_images[0]["url"] if album_images else "",
            })
        return {"tracks": tracks}
    except Exception:
        return {"tracks": []}
