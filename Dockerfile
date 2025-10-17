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

# Environment
ENV NODE_ENV=production PORT=3000

# Start application directly from source (Bun runs TypeScript natively)
CMD ["bun", "run", "src/main.ts"]
