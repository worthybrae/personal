"""Per-route SEO metadata injection for the single-page frontend.

The site draws itself into a <canvas>, so a crawler that does not execute JS
sees an empty document. Google renders JS and picks up the DOM fallback in
src/components/SeoContent.tsx, but link unfurlers (Slack, iMessage, Twitter,
LinkedIn) do not — they read the raw HTML. So the server rewrites the block
between the seo:start/seo:end markers in index.html on every document request.

Route metadata comes from dist/seo-routes.json, emitted at build time by the
seoManifest() Vite plugin, so the project and art copy lives in exactly one
place (src/lib/seo.ts).
"""

import html
import json
import re
from functools import lru_cache
from pathlib import Path

STATIC_DIR = Path(__file__).parent / "static"
INDEX_FILE = STATIC_DIR / "index.html"
MANIFEST_FILE = STATIC_DIR / "seo-routes.json"

START_MARKER = "<!-- seo:start -->"
END_MARKER = "<!-- seo:end -->"

_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}")


@lru_cache(maxsize=1)
def _manifest() -> dict:
    """Build-time site defaults and route table. Empty if the build is missing."""
    if not MANIFEST_FILE.exists():
        return {"site": {}, "routes": []}
    try:
        return json.loads(MANIFEST_FILE.read_text())
    except (json.JSONDecodeError, OSError):
        return {"site": {}, "routes": []}


@lru_cache(maxsize=1)
def _index_html() -> str | None:
    if not INDEX_FILE.exists():
        return None
    return INDEX_FILE.read_text()


def _site() -> dict:
    site = _manifest().get("site") or {}
    return {
        "url": site.get("url", "https://worthyrae.com"),
        "name": site.get("name", "Worthy Rae"),
        "title": site.get("title", "Worthy Rae"),
        "description": site.get("description", ""),
        "image": site.get("image", "/logo.png"),
        "locale": site.get("locale", "en_US"),
        "sameAs": site.get("sameAs", []),
    }


def normalize_path(path: str) -> str:
    """'work/coderview' and '/work/coderview/' both become '/work/coderview'."""
    path = "/" + path.strip("/")
    return path


def absolute(url: str) -> str:
    if url.startswith("http://") or url.startswith("https://"):
        return url
    return _site()["url"].rstrip("/") + "/" + url.lstrip("/")


def _blog_meta(slug: str) -> dict | None:
    try:
        from blog import get_post

        post = get_post(slug)
    except Exception:
        # A missing post, or a blog dependency that isn't installed, should
        # never take down the page — fall through to the site defaults.
        return None
    if not post:
        return None
    site = _site()
    return {
        "path": f"/blog/{slug}",
        "title": f"{post['title']} — {site['name']}",
        "description": post.get("description") or site["description"],
        "type": "article",
        "date": post.get("date", ""),
        "tags": post.get("tags", []),
    }


def route_meta(path: str) -> dict:
    """Metadata for a path, falling back to the site defaults for unknown routes."""
    path = normalize_path(path)
    site = _site()

    if path.startswith("/blog/"):
        meta = _blog_meta(path[len("/blog/"):])
        if meta:
            return meta

    for route in _manifest().get("routes", []):
        if route.get("path") == path:
            return route

    # Unknown path. The SPA still answers 200 (the client router falls back to
    # the home view), so mark it noindex and point the canonical at the home
    # page rather than letting every typo become an indexable duplicate.
    return {
        "path": path,
        "title": site["title"],
        "description": site["description"],
        "type": "website",
        "noindex": True,
    }


def _person_jsonld() -> dict:
    site = _site()
    return {
        "@context": "https://schema.org",
        "@type": "Person",
        "name": site["name"],
        "url": site["url"],
        "image": absolute(site["image"]),
        "jobTitle": "Software Engineer",
        "sameAs": site["sameAs"],
    }


def _page_jsonld(meta: dict, url: str) -> dict | None:
    """Structured data for the detail pages, on top of the site-wide Person."""
    site = _site()
    path = meta["path"]
    author = {"@type": "Person", "name": site["name"], "url": site["url"]}

    if path.startswith("/blog/"):
        node = {
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            "headline": meta["title"],
            "description": meta["description"],
            "url": url,
            "author": author,
        }
        date = str(meta.get("date", ""))
        if _DATE_RE.match(date):
            node["datePublished"] = date[:10]
        if meta.get("tags"):
            node["keywords"] = ", ".join(meta["tags"])
        return node

    if path.startswith("/work/") or path.startswith("/art/"):
        return {
            "@context": "https://schema.org",
            "@type": "CreativeWork",
            "name": meta["title"],
            "description": meta["description"],
            "url": url,
            "author": author,
            "creator": author,
        }

    return None


def _tag(name: str, key: str, content: str) -> str:
    return f'    <meta {name}="{key}" content="{html.escape(content, quote=True)}" />'


def _seo_block(meta: dict) -> str:
    site = _site()
    path = meta["path"]
    noindex = bool(meta.get("noindex"))
    canonical_path = "/" if (path == "/" or noindex) else path
    url = site["url"].rstrip("/") + canonical_path
    image = absolute(meta.get("image") or site["image"])
    title = meta["title"]
    description = meta["description"]
    og_type = meta.get("type", "website")

    lines = [
        START_MARKER,
        f"    <title>{html.escape(title)}</title>",
        _tag("name", "description", description),
        f'    <link rel="canonical" href="{html.escape(url, quote=True)}" />',
        _tag(
            "name",
            "robots",
            "noindex, follow"
            if noindex
            else "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
        ),
        _tag("name", "author", site["name"]),
        _tag("property", "og:site_name", site["name"]),
        _tag("property", "og:locale", site["locale"]),
        _tag("property", "og:type", og_type),
        _tag("property", "og:url", url),
        _tag("property", "og:title", title),
        _tag("property", "og:description", description),
        _tag("property", "og:image", image),
        _tag("name", "twitter:card", "summary_large_image"),
        _tag("name", "twitter:title", title),
        _tag("name", "twitter:description", description),
        _tag("name", "twitter:image", image),
    ]

    for node in (_person_jsonld(), _page_jsonld(meta, url)):
        if node is None:
            continue
        payload = json.dumps(node, ensure_ascii=False).replace("</", "<\\/")
        lines.append(f'    <script type="application/ld+json">{payload}</script>')

    lines.append(f"    {END_MARKER}")
    return "\n".join(lines)


def render_index(path: str) -> str | None:
    """index.html with its SEO block swapped for the one this route wants."""
    source = _index_html()
    if source is None:
        return None

    start = source.find(START_MARKER)
    end = source.find(END_MARKER)
    if start == -1 or end == -1:
        # Markers were removed from index.html — serve it unmodified rather
        # than corrupting the document.
        return source

    return source[:start] + _seo_block(route_meta(path)) + source[end + len(END_MARKER):]


def build_sitemap() -> str:
    """XML sitemap covering the build-time routes plus every published post."""
    site = _site()
    base = site["url"].rstrip("/")
    entries: list[tuple[str, str | None]] = []

    for route in _manifest().get("routes", []):
        if route.get("indexable") is False:
            continue
        path = route.get("path", "/")
        entries.append((base + ("/" if path == "/" else path), None))

    try:
        from blog import list_posts

        for post in list_posts():
            date = str(post.get("date", ""))
            lastmod = date[:10] if _DATE_RE.match(date) else None
            entries.append((f"{base}/blog/{post['slug']}", lastmod))
    except Exception:
        pass

    if not entries:
        entries = [(base + "/", None)]

    urls = []
    for loc, lastmod in entries:
        parts = [f"    <loc>{html.escape(loc)}</loc>"]
        if lastmod:
            parts.append(f"    <lastmod>{lastmod}</lastmod>")
        urls.append("  <url>\n" + "\n".join(parts) + "\n  </url>")

    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "\n".join(urls)
        + "\n</urlset>\n"
    )
