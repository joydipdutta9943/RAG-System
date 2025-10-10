# Use Bun's official image
FROM oven/bun:1 as base
WORKDIR /usr/src/app

# Install system dependencies for PDF processing and image handling
RUN apt-get update && apt-get install -y \
    poppler-utils \
    tesseract-ocr \
    tesseract-ocr-eng \
    imagemagick \
    ghostscript \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json bun.lockb ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Generate Prisma client
RUN bunx prisma generate

# Create uploads directory
RUN mkdir -p uploads/documents uploads/images uploads/extracted logs

# Build the application
RUN bun run build

# Production stage
FROM oven/bun:1 as production
WORKDIR /usr/src/app

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    poppler-utils \
    tesseract-ocr \
    tesseract-ocr-eng \
    imagemagick \
    ghostscript \
    && rm -rf /var/lib/apt/lists/*

# Copy built application
COPY --from=base /usr/src/app/dist ./dist
COPY --from=base /usr/src/app/node_modules ./node_modules
COPY --from=base /usr/src/app/package.json ./
COPY --from=base /usr/src/app/prisma ./prisma

# Create necessary directories
RUN mkdir -p uploads/documents uploads/images uploads/extracted logs

# Create non-root user
RUN groupadd -r appuser && useradd -r -g appuser appuser
RUN chown -R appuser:appuser /usr/src/app
USER appuser

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Start the application
CMD ["bun", "run", "start"]
