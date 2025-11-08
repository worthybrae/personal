# Analytics Backend API

FastAPI backend for Google Analytics data.

## Local Development

### Option 1: Docker (Recommended)

From the root directory:

```bash
docker-compose up
```

This will start the FastAPI backend on `http://localhost:8000`

### Option 2: Python directly

```bash
cd backend
pip install -r requirements.txt
python main.py
```

## Environment Variables

Create a `.env` file in the root directory with:

```
GA4_PROPERTY_ID=your_property_id
GA_CLIENT_EMAIL=your_service_account_email
GA_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour_private_key_here\n-----END PRIVATE KEY-----\n"
```

## API Endpoints

- `GET /` - Health check
- `GET /api/analytics` - Get visitor count for last 30 days

## Deployment

You can deploy this to:
- Railway
- Render
- Fly.io
- Google Cloud Run
- AWS ECS
- Any platform that supports Docker
