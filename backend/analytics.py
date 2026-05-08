import os
import time
from datetime import datetime, timedelta
from google.analytics.data_v1beta import BetaAnalyticsDataClient
from google.analytics.data_v1beta.types import (
    DateRange,
    Dimension,
    Metric,
    RunReportRequest,
)
from google.oauth2 import service_account

# ---------------------------------------------------------------------------
# Cache helpers
# ---------------------------------------------------------------------------
_cache: dict = {}
_CACHE_TTL = 300  # 5 minutes


def _cached(key: str, fn, *args, **kwargs):
    """Return cached value if still valid, otherwise call *fn* and cache."""
    now = time.time()
    entry = _cache.get(key)
    if entry and now - entry["ts"] < _CACHE_TTL:
        return entry["val"]
    val = fn(*args, **kwargs)
    _cache[key] = {"val": val, "ts": now}
    return val


# ---------------------------------------------------------------------------
# GA4 client / property helpers
# ---------------------------------------------------------------------------
_client: BetaAnalyticsDataClient | None = None


def _get_client() -> BetaAnalyticsDataClient:
    global _client
    if _client is None:
        creds_path = "/app/ga.json"
        if os.path.exists(creds_path):
            credentials = service_account.Credentials.from_service_account_file(
                creds_path
            )
            _client = BetaAnalyticsDataClient(credentials=credentials)
        else:
            raise RuntimeError(f"Credentials file not found at {creds_path}")
    return _client


def _get_property_ids() -> dict[str, str]:
    """Return a mapping of logical name -> GA4 property ID from env vars."""
    return {
        "portfolio": os.getenv("GA4_PROPERTY_ID", ""),
        "coderview": os.getenv("GA4_CODERVIEW_PROPERTY_ID", ""),
        "streamclout": os.getenv("GA4_STREAMCLOUT_PROPERTY_ID", ""),
    }


# ---------------------------------------------------------------------------
# Generic report runner
# ---------------------------------------------------------------------------

def _run_report(
    property_id: str,
    start_date: str = "30daysAgo",
    end_date: str = "today",
    metrics: list[str] | None = None,
    dimensions: list[str] | None = None,
) -> list[dict]:
    """Run a GA4 report and return rows as plain dicts."""
    if not property_id:
        return []

    client = _get_client()

    metric_objects = [Metric(name=m) for m in (metrics or ["screenPageViews"])]
    dimension_objects = (
        [Dimension(name=d) for d in dimensions] if dimensions else []
    )

    request = RunReportRequest(
        property=f"properties/{property_id}",
        date_ranges=[DateRange(start_date=start_date, end_date=end_date)],
        metrics=metric_objects,
        dimensions=dimension_objects if dimension_objects else [],
    )

    response = client.run_report(request)

    rows = []
    dim_headers = [h.name for h in response.dimension_headers]
    met_headers = [h.name for h in response.metric_headers]

    for row in response.rows:
        entry: dict = {}
        for i, dim in enumerate(row.dimension_values):
            entry[dim_headers[i]] = dim.value
        for i, met in enumerate(row.metric_values):
            entry[met_headers[i]] = met.value
        rows.append(entry)

    return rows


# ---------------------------------------------------------------------------
# Public API functions
# ---------------------------------------------------------------------------

def get_overview() -> dict:
    """High-level dashboard overview numbers."""
    return _cached("overview", _get_overview_impl)


def _get_overview_impl() -> dict:
    props = _get_property_ids()
    portfolio_id = props["portfolio"]

    # Total visitors last 30 days (portfolio property)
    total_visitors_30d = 0
    visitors_this_week = 0
    weekly_trend_pct = 0.0

    if portfolio_id:
        try:
            rows_30d = _run_report(
                portfolio_id,
                start_date="30daysAgo",
                end_date="today",
                metrics=["activeUsers"],
            )
            if rows_30d:
                total_visitors_30d = int(rows_30d[0].get("activeUsers", 0))

            rows_this_week = _run_report(
                portfolio_id,
                start_date="7daysAgo",
                end_date="today",
                metrics=["activeUsers"],
            )
            if rows_this_week:
                visitors_this_week = int(rows_this_week[0].get("activeUsers", 0))

            rows_prev_week = _run_report(
                portfolio_id,
                start_date="14daysAgo",
                end_date="7daysAgo",
                metrics=["activeUsers"],
            )
            prev_week = 0
            if rows_prev_week:
                prev_week = int(rows_prev_week[0].get("activeUsers", 0))

            if prev_week > 0:
                weekly_trend_pct = round(
                    ((visitors_this_week - prev_week) / prev_week) * 100, 1
                )
        except Exception:
            pass

    # Count projects (non-empty property IDs)
    project_count = sum(1 for v in props.values() if v)

    # Post count — delegate to blog module
    post_count = 0
    try:
        from blog import list_posts

        post_count = len(list_posts())
    except Exception:
        pass

    return {
        "total_visitors_30d": total_visitors_30d,
        "visitors_this_week": visitors_this_week,
        "weekly_trend_pct": weekly_trend_pct,
        "project_count": project_count,
        "post_count": post_count,
    }


def get_project_analytics() -> list[dict]:
    """Per-project page views + 7-day sparkline from individual GA4 properties."""
    return _cached("project_analytics", _get_project_analytics_impl)


def _get_project_analytics_impl() -> list[dict]:
    props = _get_property_ids()
    results: list[dict] = []

    for name, pid in props.items():
        if not pid:
            continue

        views = 0
        sparkline: list[int] = []

        try:
            rows = _run_report(
                pid,
                start_date="30daysAgo",
                end_date="today",
                metrics=["screenPageViews"],
            )
            if rows:
                views = int(rows[0].get("screenPageViews", 0))

            daily_rows = _run_report(
                pid,
                start_date="7daysAgo",
                end_date="today",
                metrics=["screenPageViews"],
                dimensions=["date"],
            )
            date_map: dict[str, int] = {}
            for r in daily_rows:
                date_map[r["date"]] = int(r.get("screenPageViews", 0))

            today = datetime.now()
            for i in range(7, -1, -1):
                d = (today - timedelta(days=i)).strftime("%Y%m%d")
                sparkline.append(date_map.get(d, 0))
        except Exception:
            sparkline = [0] * 8

        results.append(
            {
                "slug": name,
                "name": name.replace("_", " ").title(),
                "views_30d": views,
                "sparkline": sparkline,
            }
        )

    return results


def get_project_detail(slug: str) -> dict:
    """Detailed analytics for a single project by slug."""
    return _cached(f"project_detail:{slug}", _get_project_detail_impl, slug)


def _get_project_detail_impl(slug: str) -> dict:
    props = _get_property_ids()
    pid = props.get(slug, "")

    empty = {
        "slug": slug,
        "views_30d": 0,
        "unique_visitors_30d": 0,
        "avg_session_duration": 0.0,
        "daily_views": [],
        "top_sources": [],
    }

    if not pid:
        return empty

    try:
        # Total views + unique visitors
        summary_rows = _run_report(
            pid,
            start_date="30daysAgo",
            end_date="today",
            metrics=["screenPageViews", "activeUsers", "averageSessionDuration"],
        )

        views = 0
        unique = 0
        avg_dur = 0.0
        if summary_rows:
            views = int(summary_rows[0].get("screenPageViews", 0))
            unique = int(summary_rows[0].get("activeUsers", 0))
            avg_dur = round(float(summary_rows[0].get("averageSessionDuration", 0)), 1)

        # Daily views
        daily_rows = _run_report(
            pid,
            start_date="30daysAgo",
            end_date="today",
            metrics=["screenPageViews"],
            dimensions=["date"],
        )
        daily_views: list[dict] = []
        for r in sorted(daily_rows, key=lambda x: x.get("date", "")):
            daily_views.append(
                {"date": r["date"], "views": int(r.get("screenPageViews", 0))}
            )

        # Top sources
        source_rows = _run_report(
            pid,
            start_date="30daysAgo",
            end_date="today",
            metrics=["activeUsers"],
            dimensions=["sessionSource"],
        )
        top_sources: list[dict] = []
        for r in sorted(
            source_rows,
            key=lambda x: int(x.get("activeUsers", 0)),
            reverse=True,
        )[:10]:
            top_sources.append(
                {
                    "source": r.get("sessionSource", "(direct)"),
                    "users": int(r.get("activeUsers", 0)),
                }
            )

        return {
            "slug": slug,
            "views_30d": views,
            "unique_visitors_30d": unique,
            "avg_session_duration": avg_dur,
            "daily_views": daily_views,
            "top_sources": top_sources,
        }
    except Exception:
        return empty


def get_page_views() -> list[dict]:
    """View counts for individual pages from the portfolio GA4 property."""
    return _cached("page_views", _get_page_views_impl)


def _get_page_views_impl() -> list[dict]:
    props = _get_property_ids()
    portfolio_id = props["portfolio"]

    if not portfolio_id:
        return []

    try:
        rows = _run_report(
            portfolio_id,
            start_date="30daysAgo",
            end_date="today",
            metrics=["screenPageViews"],
            dimensions=["pagePath"],
        )

        pages: list[dict] = []
        for r in sorted(
            rows,
            key=lambda x: int(x.get("screenPageViews", 0)),
            reverse=True,
        ):
            path = r.get("pagePath", "/")
            pages.append(
                {
                    "path": path,
                    "views": int(r.get("screenPageViews", 0)),
                }
            )

        return pages
    except Exception:
        return []
