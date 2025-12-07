# --- Stage 1: Builder ---
FROM oven/bun:1-alpine AS builder
WORKDIR /app

# Install build dependencies (if any needed for native modules)
# We only copy package files first to leverage Docker caching
COPY package.json bun.lock ./

# Install dependencies in production mode
# --frozen-lockfile ensures reproducible builds
RUN bun install --frozen-lockfile --production

# Generate Prisma Client
COPY prisma ./prisma
RUN bunx prisma generate

# --- Stage 2: Production Runner ---
FROM oven/bun:1-alpine
WORKDIR /app

# Install System Dependencies (OCR, etc.)
# && rm -rf /var/cache/apk/* reduces image size significantly
RUN apk add --no-cache \
    poppler-utils \
    tesseract-ocr \
    tesseract-ocr-data-eng \
    imagemagick \
    curl \
    && rm -rf /var/cache/apk/*

# Copy node_modules and prisma client from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Copy application code
COPY . .

# Health check for Cloud Run and local testing

# Set Environment Variables
ENV NODE_ENV=production
# Cloud Run injects the PORT variable automatically (usually 8080)
# Do NOT set PORT here - Cloud Run will set it for us
EXPOSE 8080

# Health check (optional, Cloud Run has built-in health checks)
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:$PORT/health || exit 1

# Start command with pre-startup validation
CMD ["sh", "-c", "bun run scripts/prestart-check.ts && bun run index.ts"]