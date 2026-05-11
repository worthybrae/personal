import os
import math
from pathlib import Path

import frontmatter
import markdown

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
BLOG_DIR = Path(__file__).resolve().parent.parent / "blog"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _parse_post(filepath: Path) -> dict:
    """Load a markdown file with front-matter and return a metadata dict."""
    post = frontmatter.load(str(filepath))

    slug = filepath.stem  # filename without .md

    word_count = len(post.content.split())
    read_time = f"{max(1, math.ceil(word_count / 200))} min"

    meta: dict = {
        "slug": slug,
        "title": post.get("title", slug.replace("-", " ").title()),
        "date": str(post.get("date", "")),
        "description": post.get("description", ""),
        "tags": post.get("tags", []),
        "read_time": read_time,
        "content_raw": post.content,
    }

    return meta


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def list_posts() -> list[dict]:
    """Return all .md posts in the blog dir as metadata dicts (no content)."""
    if not BLOG_DIR.exists():
        return []

    posts: list[dict] = []
    for fp in BLOG_DIR.glob("*.md"):
        try:
            meta = _parse_post(fp)
            # Strip content for list view
            entry = {k: v for k, v in meta.items() if k != "content_raw"}
            posts.append(entry)
        except Exception:
            continue

    # Sort by date descending (newest first)
    posts.sort(key=lambda p: p.get("date", ""), reverse=True)
    return posts


def get_post(slug: str) -> dict | None:
    """Return a single post with rendered HTML content, or None."""
    if not BLOG_DIR.exists():
        return None

    filepath = BLOG_DIR / f"{slug}.md"
    if not filepath.exists():
        return None

    try:
        meta = _parse_post(filepath)

        content_html = markdown.markdown(
            meta.pop("content_raw"),
            extensions=["fenced_code", "tables", "toc"],
        )

        meta["content_html"] = content_html
        return meta
    except Exception:
        return None
