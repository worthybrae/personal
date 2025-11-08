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
	docker-compose build

run:
	@echo "🚀 Starting application..."
	@echo "Frontend will be available at: http://localhost:5173"
	@echo "Backend will be available at: http://localhost:8000"
	docker-compose up

run-detached:
	@echo "🚀 Starting application in background..."
	docker-compose up -d
	@echo "✅ Application started!"
	@echo "Frontend: http://localhost:5173"
	@echo "Backend: http://localhost:8000"

stop:
	@echo "🛑 Stopping application..."
	docker-compose down

restart: stop run

logs:
	docker-compose logs -f

clean:
	@echo "🧹 Cleaning up..."
	docker-compose down -v --rmi all
	@echo "✅ Cleanup complete!"
