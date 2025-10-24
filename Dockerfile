# Simple Dockerfile for Enhanced RAG System
FROM oven/bun:1-alpine

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    poppler-utils \
    tesseract-ocr \
    tesseract-ocr-data-eng \
    imagemagick \
    curl

# Copy package files and install dependencies
COPY package.json bun.lock ./
RUN bun install

# Copy application code
COPY . .

# Generate Prisma client
RUN bunx prisma generate

# Create logs directory
RUN mkdir -p logs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Environment (set these in your deployment or .env file)
ENV NODE_ENV=production
ENV PORT=3000

# Note: Set these environment variables in production deployment:
# - FRONTEND_URL=https://your-frontend-domain.com
# - COOKIE_DOMAIN=.your-domain.com
# - JWT_SECRET=your-super-secret-jwt-key
# - DATABASE_URL=your-mongodb-connection-string
# - REDIS_URL=your-redis-connection-string

# Start application directly from source (Bun runs TypeScript natively)
CMD ["bun", "run", "src/main.ts"]
