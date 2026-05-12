FRONTEND_PORT ?= 5176
BACKEND_PORT ?= 8001

.PHONY: help build run stop clean logs restart run-frontend run-backend run-local

help:
	@echo "Available commands:"
	@echo ""
	@echo "  Local development:"
	@echo "  make run-frontend  - Start the Vite frontend (port 5173)"
	@echo "  make run-backend   - Start the FastAPI backend (port 8000)"
	@echo "  make run-local     - Start both frontend and backend"
	@echo ""
	@echo "  Docker:"
	@echo "  make build         - Build the Docker image"
	@echo "  make run           - Start the application via Docker"
	@echo "  make stop          - Stop the application"
	@echo "  make restart       - Restart the application"
	@echo "  make logs          - View application logs"
	@echo "  make clean         - Stop and remove containers, images, and volumes"

run-frontend:
	@echo "Starting Vite frontend on http://localhost:$(FRONTEND_PORT)..."
	VITE_BACKEND_PORT=$(BACKEND_PORT) npx vite --port $(FRONTEND_PORT)

run-backend:
	@echo "Starting FastAPI backend on http://localhost:$(BACKEND_PORT)..."
	cd backend && PORT=$(BACKEND_PORT) FRONTEND_PORT=$(FRONTEND_PORT) python main.py

run-local:
	@echo "Starting frontend and backend..."
	@echo "Frontend: http://localhost:$(FRONTEND_PORT)"
	@echo "Backend:  http://localhost:$(BACKEND_PORT)"
	npx concurrently --names "frontend,backend" --prefix-colors "cyan,magenta" \
		"VITE_BACKEND_PORT=$(BACKEND_PORT) npx vite --port $(FRONTEND_PORT)" \
		"cd backend && PORT=$(BACKEND_PORT) FRONTEND_PORT=$(FRONTEND_PORT) python main.py"

build:
	@echo "🔨 Building Docker image..."
	docker build -t portfolio-app .

run:
	@echo "🚀 Starting application..."
	@echo "Frontend will be available at: http://localhost:5173"
	@echo "Backend will be available at: http://localhost:8000"
	docker run -p 5173:5173 -p 8000:8000 --env-file .env portfolio-app

run-detached:
	@echo "🚀 Starting application in background..."
	docker run -d -p 5173:5173 -p 8000:8000 --env-file .env --name portfolio-app portfolio-app
	@echo "✅ Application started!"
	@echo "Frontend: http://localhost:5173"
	@echo "Backend: http://localhost:8000"

stop:
	@echo "🛑 Stopping application..."
	docker stop portfolio-app || true
	docker rm portfolio-app || true

restart: stop run

logs:
	docker logs -f portfolio-app

clean:
	@echo "🧹 Cleaning up..."
	docker stop portfolio-app || true
	docker rm portfolio-app || true
	docker rmi portfolio-app || true
	@echo "✅ Cleanup complete!"
