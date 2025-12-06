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

# Cloud Run ignores HEALTHCHECK in Dockerfile, but it's good for local testing
# We remove it here to save a tiny bit of layer overhead, 
# relying instead on Cloud Run's built-in health probes.

# Set Environment Variables
ENV NODE_ENV=production
# Cloud Run injects the PORT variable automatically (usually 8080)
ENV PORT=3000
EXPOSE 3000

# Start command
CMD ["bun", "run", "src/main.ts"]