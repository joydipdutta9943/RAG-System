# Use Bun's official image
FROM oven/bun:1-alpine AS base
WORKDIR /usr/src/app

# Install system dependencies for PDF processing and image handling
RUN apk add --no-cache \
    poppler-utils \
    tesseract-ocr \
    tesseract-ocr-data-eng \
    imagemagick \
    ghostscript \
    curl \
    ca-certificates

# Copy package files
COPY package.json bun.lock ./

# Install dependencies
RUN bun install

# Copy source code
COPY . .

# Generate Prisma client
RUN bunx prisma generate

# Build the application
RUN bun run build

# Production stage - smaller and more secure
FROM oven/bun:1-alpine AS production
WORKDIR /usr/src/app

# Install only runtime dependencies
RUN apk add --no-cache \
    poppler-utils \
    tesseract-ocr \
    tesseract-ocr-data-eng \
    imagemagick \
    ghostscript \
    curl \
    ca-certificates

# Copy built application and dependencies
COPY --from=base /usr/src/app/dist ./dist
COPY --from=base /usr/src/app/node_modules ./node_modules
COPY --from=base /usr/src/app/package.json ./
COPY --from=base /usr/src/app/prisma ./prisma

# Create logs directory only (no uploads needed since files are processed in memory)
RUN mkdir -p logs

# Create non-root user for security
RUN addgroup -g 1001 -S appuser && \
    adduser -S appuser -u 1001 -G appuser

# Change ownership of app directory
RUN chown -R appuser:appuser /usr/src/app
USER appuser

# Expose port for HTTP and WebSocket (Socket.IO)
EXPOSE 3000

# Health check for container orchestration (ECS, EKS, etc.)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Start the application
CMD ["bun", "run", "start"]
