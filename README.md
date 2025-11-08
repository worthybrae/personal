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

Make sure your `.env` file in the root directory has:

```env
GA4_PROPERTY_ID=512372974
GA_CLIENT_EMAIL=ga-viewer@jovial-totality-477616-s4.iam.gserviceaccount.com
GA_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

## Tech Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: FastAPI + Python
- **Analytics**: Google Analytics 4
- **Contact Form**: Formspree
- **Containerization**: Docker + Docker Compose

## Project Structure

```
├── src/                    # React frontend code
├── backend/                # FastAPI backend
│   ├── main.py            # FastAPI app
│   └── requirements.txt   # Python dependencies
├── Dockerfile             # Unified Dockerfile (frontend + backend)
├── docker-compose.yml     # Docker orchestration
├── Makefile              # Easy commands
└── .env                  # Environment variables
```

## Deployment

- **Frontend**: Deploy to Vercel
- **Backend**: Deploy Docker container to Railway, Render, Fly.io, or any Docker host
