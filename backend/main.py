from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from google.analytics.data_v1beta import BetaAnalyticsDataClient
from google.analytics.data_v1beta.types import DateRange, Metric, RunReportRequest
from google.oauth2 import service_account
import os
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
        # Get credentials from environment variables
        property_id = os.getenv("GA4_PROPERTY_ID")
        client_email = os.getenv("GA_CLIENT_EMAIL")
        private_key = os.getenv("GA_PRIVATE_KEY")

        print(f"Property ID: {property_id}")
        print(f"Client Email: {client_email}")
        print(f"Private Key exists: {bool(private_key)}")

        if not property_id or not client_email or not private_key:
            missing = []
            if not property_id: missing.append("GA4_PROPERTY_ID")
            if not client_email: missing.append("GA_CLIENT_EMAIL")
            if not private_key: missing.append("GA_PRIVATE_KEY")
            error_msg = f"Missing environment variables: {', '.join(missing)}"
            print(f"ERROR: {error_msg}")
            raise HTTPException(
                status_code=500,
                detail=error_msg
            )

        # Create credentials
        credentials_info = {
            "type": "service_account",
            "client_email": client_email,
            "private_key": private_key.replace("\\n", "\n"),
            "token_uri": "https://oauth2.googleapis.com/token",
        }

        credentials = service_account.Credentials.from_service_account_info(
            credentials_info
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
    port = int(os.getenv("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)
