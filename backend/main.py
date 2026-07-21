import os
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, RedirectResponse
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

frontend_port = os.getenv("FRONTEND_PORT", "5176")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        f"http://localhost:{frontend_port}",
        "https://worthyrae.com",
        "https://www.worthyrae.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

STATIC_DIR = Path(__file__).parent / "static"


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/analytics/overview")
async def analytics_overview():
    from analytics import get_overview
    return get_overview()


@app.get("/api/analytics/projects")
async def analytics_projects():
    from analytics import get_project_analytics
    return {"projects": get_project_analytics()}


@app.get("/api/analytics/project/{slug}")
async def analytics_project_detail(slug: str):
    from analytics import get_project_detail
    return get_project_detail(slug)


@app.get("/api/analytics/pages")
async def analytics_pages():
    from analytics import get_page_views
    return {"pages": get_page_views()}


@app.get("/api/blog")
async def blog_list():
    from blog import list_posts
    return {"posts": list_posts()}


@app.get("/api/blog/{slug}")
async def blog_detail(slug: str):
    from blog import get_post
    post = get_post(slug)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post


@app.get("/api/music/catalog")
async def music_catalog():
    from music import get_catalog
    catalog = get_catalog()
    if catalog is None:
        raise HTTPException(status_code=503, detail="music catalog unavailable")
    return catalog


@app.get("/api/music/stream/{track_id}")
async def music_stream(track_id: str):
    from music import get_stream_url
    url = get_stream_url(track_id)
    if url is None:
        raise HTTPException(status_code=404, detail="unknown track")
    return RedirectResponse(url, status_code=302)


@app.get("/api/spotify/now-playing")
def spotify_now_playing():
    from spotify import get_now_playing
    return get_now_playing()

@app.get("/api/spotify/top-tracks")
def spotify_top_tracks():
    from spotify import get_top_tracks
    return get_top_tracks()

@app.get("/api/spotify/callback")
def spotify_callback(code: str):
    """One-time OAuth callback to capture refresh token."""
    from spotify import _get_client
    _get_client()
    return {"status": "authenticated"}


@app.get("/api/letterboxd/recent")
def letterboxd_recent():
    from letterboxd import get_recent_films
    return get_recent_films()


# Serve frontend static files (JS, CSS, assets)
if STATIC_DIR.exists():
    app.mount("/assets", StaticFiles(directory=STATIC_DIR / "assets"), name="assets")

    @app.get("/{path:path}")
    async def spa_fallback(path: str):
        file = STATIC_DIR / path
        if file.is_file():
            return FileResponse(file)
        return FileResponse(STATIC_DIR / "index.html")


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8001"))
    uvicorn.run(app, host="0.0.0.0", port=port)
