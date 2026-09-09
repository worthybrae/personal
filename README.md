# Portfolio Website

Personal portfolio with Google Analytics visitor tracking and contact form.

## Quick Start

### Prerequisites
- Docker Desktop installed and running
- Make (comes pre-installed on Mac)

### Running Locally

```bash
# First time setup - build the Docker image
make build

# Start the application (frontend + backend)
make run
```

That's it! The app will be running at:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000

### Available Commands

```bash
make help       # Show all available commands
make build      # Build the Docker image
make run        # Start the application
make stop       # Stop the application
make restart    # Restart the application
make logs       # View application logs
make clean      # Clean up everything
```

## Environment Variables

**Local Development:**
- Create a `.env` file with: `GA4_PROPERTY_ID=123456789`
- Place your `ga.json` credentials file in the root directory (not committed to git)

**Production (Railway):**
- Set `GA4_PROPERTY_ID` environment variable
- Set `GOOGLE_CREDENTIALS` environment variable with the contents of ga.json (the startup script will create the file automatically)

**Live artwork:**
- Set `VITE_LIVE_STREAM_URL=https://livestream-morphing-production.up.railway.app` when building the portfolio to enable the live playback handoff on `/art/livestream-art`. Production uses this direct Railway HTTPS origin; `live.worthyrae.com` is optional future branding, not a dependency. The tuned five-viewer benchmark projects about $4.00 for 50 one-hour sessions with ten-minute overhead ($4.10 with fifteen-minute overhead). This is incremental stream usage, not a hard cap on the shared workspace bill.
- Leave it unset to intentionally keep the prerecorded Abbey Road recording in place.

**Live artwork rollback:**

Remove `VITE_LIVE_STREAM_URL` from the existing `personal` Railway service and
redeploy it, because Vite embeds this URL during the frontend build. Confirm that
`/art/livestream-art` plays the recording, then stop the separate
`livestream-morphing` Railway deployment. This order keeps the artwork available
during rollback. Do not set a shared-workspace hard usage limit to stop the
stream; that could also stop the portfolio.

## Tech Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: FastAPI + Python
- **Analytics**: Google Analytics 4
- **Contact Form**: Formspree
- **Containerization**: Docker

## Project Structure

```
├── src/                    # React frontend code
├── backend/                # FastAPI backend
│   ├── main.py            # FastAPI app
│   └── requirements.txt   # Python dependencies
├── Dockerfile             # Unified Dockerfile (frontend + backend)
├── Makefile              # Easy commands
├── ga.json                # Google Analytics credentials (local only, not in git)
└── .env                  # Environment variables (not in git)
```
