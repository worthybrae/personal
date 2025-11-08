.PHONY: help build run stop clean logs restart

help:
	@echo "Available commands:"
	@echo "  make build    - Build the Docker image"
	@echo "  make run      - Start the application (backend + frontend)"
	@echo "  make stop     - Stop the application"
	@echo "  make restart  - Restart the application"
	@echo "  make logs     - View application logs"
	@echo "  make clean    - Stop and remove containers, images, and volumes"

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
