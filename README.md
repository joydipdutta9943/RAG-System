# Enhanced RAG System

A multi-modal RAG (Retrieval-Augmented Generation) system with Node.js backend and Google AI integration for advanced embedding capabilities.

## Features

- **Google AI Embeddings**: Uses Google's `text-embedding-004` model for high-quality 768-dimensional embeddings
- **Multi-modal Support**: Process PDFs, images, and text files
- **Vector Search**: Semantic search with MongoDB Atlas vector search
- **AI-Powered Search**: Context-aware search using Google's Gemini models
- **Real-time Processing**: WebSocket support for live document processing updates
- **Authentication & Authorization**: JWT-based auth with role management

## Prerequisites

- [Bun](https://bun.sh) runtime (v1.2.16 or higher)
- [Docker](https://docker.com) and Docker Compose
- [Node.js](https://nodejs.org) (v18+ recommended)
- MongoDB database (local or MongoDB Atlas)
- Redis server
- Google AI API key (for embeddings and generative AI)

## Environment Setup

1. **Copy environment files:**

```bash
cp .env.example .env
```

2. **Configure environment variables in `.env`:**

```bash
# Database
DATABASE_URL="mongodb://localhost:27017/enhanced-rag-system"
# Or for MongoDB Atlas:
# DATABASE_URL="mongodb+srv://<username>:<password>@cluster-url/enhanced-rag-system?retryWrites=true&w=majority"

# Redis
REDIS_URL="redis://localhost:6379"

# Google AI API (Required for embeddings and generative AI)
GOOGLE_AI_API_KEY="your_google_ai_api_key"

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

## Getting Google AI API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy the key and add it to your `.env` file
4. The API provides free tier limits (60 requests/minute for embeddings)

## Installation

### 1. Install Backend Dependencies

```bash
bun install
```

### 3. Setup Database

```bash
# Generate Prisma client
bun run db:generate

# Push schema to database (creates collections)
bun run db:push

# Optional: View and manage data
bun run db:studio
```

### 4. Verify Google AI Integration

The system will automatically use Google's embedding API when processing documents. No additional setup is required beyond setting the API key.

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

This will start Redis and other supporting services.

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

1. **Google AI Integration:**
   - Automatic 768-dimensional embeddings using Google's `text-embedding-004` model
   - Generative AI responses with Google's Gemini models
   - Cost-effective with free tier limits

2. **Multi-modal Document Processing:**
   - Upload PDFs, images, text files
   - OCR processing for images
   - Text extraction and automatic embedding generation

3. **AI-Powered Search:**
   - Semantic search using Google embeddings
   - Hybrid search combining vector and text search
   - AI-generated summaries and responses

4. **Real-time Features:**
   - Live processing status via WebSocket
   - Real-time notifications
   - Collaborative features

5. **Analytics:**
   - Usage metrics
   - Search analytics
   - Performance monitoring

6. **Authentication & Authorization:**
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
│   ├── controllers/       # API route handlers
│   ├── middleware/        # Express middleware
│   ├── repositories/      # Data access layer
│   ├── routes/           # REST API routes
│   ├── services/         # Business logic services
│   ├── types/            # TypeScript type definitions
│   ├── utils/            # Utility functions
│   └── main.ts           # Application entry point
├── prisma/             # Database schema and migrations
├── scripts/            # Utility scripts (e.g., migration scripts)
├── uploads/            # File uploads directory
├── models/             # Legacy local models (no longer used)
└── docker-compose.yml  # Docker services configuration
```

## Architecture Changes

### Embedding System
- **Before**: Used local Xenova/all-MiniLM-L6-v2 model (384 dimensions)
- **After**: Uses Google's text-embedding-004 API (768 dimensions)
- **Benefits**:
  - No local model files needed (23MB saved)
  - Better performance with Google's optimized infrastructure
  - Higher quality embeddings
  - Simplified deployment

### Vector Index
- Automatically creates/updates MongoDB Atlas vector search index
- Supports 768-dimensional vectors
- Includes filter fields for userId and fileType

## Production Deployment

1. **Build applications:**

```bash
bun run build
```

2. **Set production environment variables**
   - Configure MongoDB Atlas connection string
   - Set Redis connection URL
   - Add Google AI API key
   - Set secure JWT secret

3. **Start production servers:**

```bash
bun run start  # Backend
```

## Monitoring Google AI Usage

Monitor your Google AI API usage:
- Free tier: 60 requests/minute for embeddings
- Pricing: ~$0.00025 per 1,000 characters beyond free tier
- The system implements caching to reduce API calls
- Check the `/api/search/ai-status` endpoint for usage statistics

## Migration from Local Models

If migrating from a previous version with local models:

1. **Backup existing data** (optional)
2. **Delete old embeddings** (required due to dimension change)
3. **Run the migration script** (optional, handles index recreation):
   ```bash
   bun run scripts/migrate-vector-dimensions.ts
   ```
4. **Re-upload documents** to generate new 768-dimensional embeddings

The application will automatically handle the new vector index creation when started.

## License

This project is private and proprietary.