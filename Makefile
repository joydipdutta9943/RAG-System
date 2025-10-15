# Enhanced RAG System - Docker and AWS Deployment

.PHONY: help build dev prod clean docker-build docker-run docker-stop deploy-ecr

# Default target
help:
	@echo "Enhanced RAG System - Available commands:"
	@echo ""
	@echo "Development:"
	@echo "  make dev         - Start development environment with docker-compose.dev.yml"
	@echo "  make build       - Build the application locally"
	@echo "  make prod        - Start production environment with docker-compose.yml"
	@echo ""
	@echo "Docker:"
	@echo "  make docker-build - Build Docker image"
	@echo "  make docker-run  - Run Docker container locally"
	@echo "  make docker-stop - Stop running containers"
	@echo "  make clean       - Clean up Docker resources"
	@echo ""
	@echo "AWS Deployment:"
	@echo "  make deploy-ecr  - Build and push to ECR (requires AWS setup)"
	@echo ""
	@echo "Testing:"
	@echo "  make test        - Run tests"
	@echo "  make lint        - Run linting and type checking"

# Development targets
dev:
	@echo "🚀 Starting development environment..."
	docker-compose -f docker-compose.dev.yml up -d
	@echo "✅ Development environment started"
	@echo "🌐 API available at: http://localhost:3000"
	@echo "🗄️  MongoDB at: mongodb://localhost:27017"
	@echo "🗄️  Redis at: redis://localhost:6379"

build:
	@echo "🔨 Building application..."
	bun run build
	@echo "✅ Build completed"

prod:
	@echo "🚀 Starting production environment..."
	docker-compose up -d
	@echo "✅ Production environment started"
	@echo "🌐 API available at: http://localhost:3000"

# Docker targets
docker-build:
	@echo "🐳 Building Docker image..."
	docker build -t rag-system .
	@echo "✅ Docker image built"

docker-run: docker-build
	@echo "🐳 Running Docker container..."
	docker run -d --name rag-system -p 3000:3000 rag-system
	@echo "✅ Container running at http://localhost:3000"

docker-stop:
	@echo "🛑 Stopping Docker containers..."
	docker stop rag-system 2>/dev/null || echo "No running containers to stop"
	docker rm rag-system 2>/dev/null || echo "No containers to remove"
	@echo "✅ Containers stopped and removed"

clean: docker-stop
	@echo "🧹 Cleaning up Docker resources..."
	docker-compose -f docker-compose.yml down -v 2>/dev/null || echo "No docker-compose services running"
	docker-compose -f docker-compose.dev.yml down -v 2>/dev/null || echo "No dev services running"
	docker system prune -f
	@echo "✅ Cleanup completed"

# AWS deployment targets
deploy-ecr:
	@echo "🚀 Deploying to AWS ECR..."
	@if [ -z "$(AWS_REGION)" ]; then echo "❌ AWS_REGION not set"; exit 1; fi
	@if [ -z "$(AWS_ACCOUNT_ID)" ]; then echo "❌ AWS_ACCOUNT_ID not set"; exit 1; fi
	@echo "Building Docker image..."
	docker build -t rag-system .
	@echo "Logging into ECR..."
	aws ecr get-login-password --region $(AWS_REGION) | docker login --username AWS --password-stdin $(AWS_ACCOUNT_ID).dkr.ecr.$(AWS_REGION).amazonaws.com
	@echo "Creating ECR repository (if needed)..."
	aws ecr create-repository --repository-name rag-system --region $(AWS_REGION) || echo "Repository already exists"
	@echo "Tagging and pushing image..."
	docker tag rag-system:latest $(AWS_ACCOUNT_ID).dkr.ecr.$(AWS_REGION).amazonaws.com/rag-system:latest
	docker push $(AWS_ACCOUNT_ID).dkr.ecr.$(AWS_REGION).amazonaws.com/rag-system:latest
	@echo "✅ Deployment to ECR completed"
	@echo "📋 Next steps:"
	@echo "   1. Update ECS task definition with new image"
	@echo "   2. Update ECS service"
	@echo "   3. Monitor deployment in AWS Console"

# Testing targets
test:
	@echo "🧪 Running tests..."
	bun run test

lint:
	@echo "🔍 Running linting and type checking..."
	bun run check

# Utility targets
logs:
	@echo "📋 Showing application logs..."
	docker-compose logs -f

logs-dev:
	@echo "📋 Showing development logs..."
	docker-compose -f docker-compose.dev.yml logs -f

status:
	@echo "📊 Checking container status..."
	docker-compose ps
	@echo ""
	docker-compose -f docker-compose.dev.yml ps

# Environment setup
setup-env:
	@echo "📝 Setting up environment files..."
	@if [ ! -f .env ]; then cp .env.example .env && echo "✅ Created .env from .env.example"; fi
	@if [ ! -f .env.production ]; then cp .env.production.example .env.production && echo "✅ Created .env.production from .env.production.example"; fi
	@echo "📝 Please update the environment files with your configuration"

# Database operations
db-migrate:
	@echo "🗄️ Running database migrations..."
	bun run db:migrate

db-generate:
	@echo "🗄️ Generating Prisma client..."
	bun run db:generate

db-studio:
	@echo "🗄️ Starting Prisma Studio..."
	bun run db:studio