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

