# Enhanced RAG System

A multi-modal RAG (Retrieval-Augmented Generation) system with Node.js backend and AI processing capabilities.

## Prerequisites

- [Bun](https://bun.sh) runtime (v1.2.16 or higher)
- [Docker](https://docker.com) and Docker Compose
- [Node.js](https://nodejs.org) (v18+ recommended)
- MongoDB database
- Redis server

## Environment Setup

1. **Copy environment files:**

```bash
cp .env.example .env
```

2. **Configure environment variables in `.env`:**

```bash
# Database
DATABASE_URL="mongodb://localhost:27017/enhanced-rag-system"

# Redis
REDIS_URL="redis://localhost:6379"

# API Keys
GOOGLE_AI_API_KEY="your_gemini_api_key"

# Authentication
JWT_SECRET="your_jwt_secret_key"
JWT_EXPIRES_IN="7d"

# Server
PORT=3000
NODE_ENV="development"

# File Upload
MAX_FILE_SIZE="50mb"
UPLOAD_PATH="./uploads"
```

## Installation

### 1. Install Backend Dependencies

```bash
bun install
```

### 3. Setup Database

```bash
# Generate Prisma client
bun run db:generate

# Run database migrations
bun run db:migrate

# Or push schema directly (for development)
bun run db:push
```

## Development

### Start All Services

1. **Start Backend Server:**

```bash
bun run dev
```

*Runs on <http://localhost:3000>*


3. **Start Database Services (optional, if using Docker):**

```bash
docker-compose up -d
```

### Individual Commands

#### Backend Commands

```bash
# Development with hot reload
bun run dev

# Production build
bun run build

# Start production server
bun run start

# Database operations
bun run db:generate    # Generate Prisma client
bun run db:push        # Push schema to database
bun run db:migrate     # Run migrations
bun run db:studio      # Open Prisma Studio

# Testing
bun run test

# Code quality
bun run lint           # Lint with Biome
bun run lint:fix       # Fix linting issues
bun run format         # Format code with Biome
bun run check          # TypeScript + lint check
```

## Testing the System

### 1. Authentication Flow

```bash
# Register a new user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### 2. Document Upload

```bash
# Upload a document (replace JWT_TOKEN with your token)
curl -X POST http://localhost:3000/api/documents/upload \
  -H "Authorization: Bearer JWT_TOKEN" \
  -F "file=@/path/to/your/document.pdf"
```


### 4. Health Check

```bash
# Check system health
curl http://localhost:3000/health
```


## API Endpoints

### REST Endpoints

#### Authentication Routes (`/api/auth`)
- `POST /api/auth/register` - ✅ Working - User registration with email validation
- `POST /api/auth/login` - ✅ Working - User login with JWT token generation
- `GET /api/auth/profile` - ✅ Working - Get current user profile and statistics

#### Document Management Routes (`/api/documents`)
- `POST /api/documents/upload` - ✅ Working - Upload single document with AI processing
- `POST /api/documents/batch-upload` - ✅ Working - Upload multiple documents in batch
- `GET /api/documents/` - ✅ Working - Get user documents with pagination and filtering
- `GET /api/documents/:id` - ✅ Working - Get single document details
- `DELETE /api/documents/:id` - ✅ Working - Delete document and related data
- `PATCH /api/documents/:id` - ✅ Working - Update document metadata (title, summary)

#### Vector Search Routes (`/api/documents`)
- `GET /api/documents/vector-search` - ✅ Working - Semantic search using vector embeddings
- `GET /api/documents/hybrid-search` - ✅ Working - Hybrid search combining vector and text search
- `GET /api/documents/enhanced-search` - ✅ Working - Enhanced search with optional vector support
- `GET /api/documents/search-stats` - ✅ Working - Get vector search statistics
- `GET /api/documents/:id/similar` - ✅ Working - Find similar documents to a given document

#### Search Routes (`/api/search`)
- `POST /api/search/text` - ✅ Working - AI-powered text search with context understanding
- `POST /api/search/image` - ✅ Working - Image-based search with OCR and AI analysis
- `POST /api/search/multimodal` - ✅ Working - Combined text and image search
- `GET /api/search/history` - ✅ Working - Get user's search history with pagination
- `GET /api/search/ai-status` - ✅ Working - Get AI agent status and quota information

#### Health Check Routes (`/health`)
- `GET /health` - ✅ Working - Basic health check with system info
- `GET /health/ready` - ✅ Working - Readiness probe for container orchestration
- `GET /health/live` - ✅ Working - Liveness probe for container orchestration
- `GET /health/metrics` - ✅ Working - System metrics and performance data

### WebSocket Events

#### Connection Events
- `connection` - ✅ Working - Client connects to WebSocket
- `disconnect` - ✅ Working - Client disconnects from WebSocket

#### Room Management
- `join-room` - ✅ Working - Join a specific room for real-time updates
- `leave-room` - ✅ Working - Leave a specific room

#### Document Processing
- `document-processing` - ✅ Working - Real-time document processing updates
- `processing-update` - ✅ Working - Broadcast processing status and progress


## Key Features to Test

1. **Multi-modal Document Processing:**
   - Upload PDFs, images, text files
   - OCR processing for images
   - Text extraction and embedding generation

2. **AI-Powered Search:**
   - Semantic search using embeddings
   - AI-generated summaries
   - Relevance scoring

3. **Real-time Features:**
   - Live processing status
   - Real-time notifications
   - Collaborative features

4. **Analytics:**
   - Usage metrics
   - Search analytics
   - Performance monitoring

5. **Authentication & Authorization:**
   - JWT-based authentication
   - Role-based access control
   - Session management

## Troubleshooting

### Common Issues

1. **Database Connection:**

```bash
# Check if MongoDB is running
mongosh --eval "db.adminCommand('ping')"

# Reset database
bun run db:push --force-reset
```

2. **Redis Connection:**

```bash
# Check Redis status
redis-cli ping
```

3. **Port Conflicts:**

```bash
# Check what's running on ports
lsof -i :3000  # Backend
```

4. **Build Issues:**

```bash
# Clean and reinstall dependencies
rm -rf node_modules bun.lock
bun install

```

5. **TypeScript Errors:**

```bash
# Run type checking
bun run check
```

## Project Structure

```text
Enhanced-RAG-System/
├── src/                    # Backend source code
│   ├── config/            # Configuration files
│   ├── middleware/        # Express middleware
│   ├── routes/           # REST API routes
│   ├── services/         # Business logic services
│   └── server.ts         # Main server file
├── prisma/             # Database schema and migrations
├── uploads/            # File uploads directory
├── scripts/            # Utility scripts
└── docker-compose.yml  # Docker services
```

## Production Deployment

1. **Build applications:**

```bash
bun run build
```

2. **Set production environment variables**

3. **Start production servers:**

```bash
bun run start  # Backend
```

## License

This project is private and proprietary.