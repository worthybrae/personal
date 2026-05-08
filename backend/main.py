import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://worthyrae.com",
        "https://www.worthyrae.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
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


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
