from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from google.analytics.data_v1beta import BetaAnalyticsDataClient
from google.analytics.data_v1beta.types import DateRange, Metric, RunReportRequest
from google.oauth2 import service_account
import os
import json
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

# CORS settings - allow requests from your frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://worthyrae.com", "https://*.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Analytics API is running"}

@app.get("/api/analytics")
async def get_analytics():
    try:
        # Get property ID from environment variable
        property_id = os.getenv("GA4_PROPERTY_ID")

        # Use ga.json file for both local and production
        credentials_path = "/app/ga.json"

        if not os.path.exists(credentials_path):
            print(f"Credentials file not found at {credentials_path}")
            raise HTTPException(
                status_code=500,
                detail="Google credentials file not found"
            )

        print(f"Using credentials from {credentials_path}")
        credentials = service_account.Credentials.from_service_account_file(
            credentials_path
        )

        # Initialize the Analytics Data API client
        client = BetaAnalyticsDataClient(credentials=credentials)

        # Create the request
        request = RunReportRequest(
            property=f"properties/{property_id}",
            date_ranges=[DateRange(start_date="30daysAgo", end_date="today")],
            metrics=[Metric(name="screenPageViews")],
        )

        # Run the report
        response = client.run_report(request)

        # Extract view count
        view_count = 0
        if response.rows:
            view_count = int(response.rows[0].metric_values[0].value)

        return {
            "views": view_count,
            "period": "Last 30 days"
        }

    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"ERROR in /api/analytics: {str(e)}")
        print(f"Full traceback:\n{error_trace}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    import os
    # Railway sets PORT to 8080, local dev uses 8000
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
