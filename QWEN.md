# Enhanced RAG System - QWEN Context

## Project Overview

The Enhanced RAG (Retrieval-Augmented Generation) System is a multi-modal document processing and AI-powered search system built with Node.js, Bun runtime, and Google AI integration. It features advanced embedding capabilities using Google's `text-embedding-004` model, vector search with MongoDB Atlas, and real-time processing via WebSocket.

### Key Technologies
- **Backend**: Node.js with Bun runtime (ESNext)
- **Database**: MongoDB with Prisma ORM
- **Embeddings**: Google AI text-embedding-004 (768 dimensions)
- **Search**: MongoDB Atlas Vector Search with fallback options
- **Real-time**: Socket.IO for WebSocket communication
- **Packaging**: Bun for fast dependency management and execution
- **Containerization**: Docker and Docker Compose

### Architecture Highlights
- **Functional Programming**: Services and controllers follow functional programming patterns
- **Multi-modal Support**: Handles PDFs, images, and text files with OCR capabilities
- **Cost Optimization**: Uses free-tier Google AI services to eliminate embedding costs
- **Cookie-Based Authentication**: Secure session management via HTTP-only cookies
- **Microservices Design**: Modular architecture with clear separation of concerns

## Project Structure

```
Enhanced-RAG-System/
├── prisma/                 # Database schema and migrations
├── scripts/                # Utility scripts
├── src/                    # Backend source code
│   ├── config/            # Configuration files (database, logger, etc.)
│   ├── controllers/       # API route handlers
│   ├── loaders/           # Service initialization and dependency injection
│   ├── middleware/        # Express middleware
│   ├── repositories/      # Data access layer
│   ├── routes/            # REST API routes
│   ├── services/          # Business logic services
│   ├── types/             # TypeScript type definitions
│   ├── utils/             # Utility functions
│   └── main.ts            # Application entry point
├── uploads/                # File uploads directory (not tracked)
├── docker-compose.yml      # Docker services configuration
├── Dockerfile             # Container build configuration
├── package.json           # Project dependencies and scripts
├── biome.json             # Code formatting and linting config
└── README.md              # Project documentation
```

## Building and Running

### Prerequisites
- [Bun](https://bun.sh) runtime (v1.2.16 or higher)
- [Docker](https://docker.com) and Docker Compose (for optional services)
- Google AI API key
- MongoDB database (local or MongoDB Atlas)

### Environment Setup
1. Copy `.env.example` to `.env` and configure environment variables:
   ```bash
   cp .env.example .env
   ```
2. Set required environment variables:
   - `DATABASE_URL`: MongoDB connection string
   - `REDIS_URL`: Redis connection string
   - `GOOGLE_AI_API_KEY`: Google AI API key
   - `JWT_SECRET`: Secret for JWT token generation

### Installation Commands
```bash
# Install dependencies
bun install

# Generate Prisma client
bun run db:generate

# Push schema to database
bun run db:push

# Open Prisma Studio to view data
bun run db:studio
```

### Running the Application
```bash
# Development mode (with auto-reload)
bun run dev

# Production build
bun run build

# Start production server
bun run start

# Or run production build directly
bun run prod
```

### Docker Deployment
```bash
# Start all services (Redis and API) with Docker Compose
docker-compose up -d

# Build and start with fresh containers
docker-compose up --build -d
```

## API Endpoints

### Authentication (`/api/auth`)
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login (sets HTTP-only cookie)
- `GET /api/auth/profile` - Get current user profile
- `POST /api/auth/logout` - Logout (clears cookie)

### Documents (`/api/documents`)
- `POST /api/documents/upload` - Upload single document
- `POST /api/documents/batch-upload` - Upload multiple documents
- `GET /api/documents` - Get user documents with pagination
- `GET /api/documents/:id` - Get single document details
- `PATCH /api/documents/:id` - Update document metadata
- `DELETE /api/documents/:id` - Delete document

### Search (`/api/documents/search`)
- `GET /api/documents/vector-search` - Semantic search using vector embeddings
- `GET /api/documents/hybrid-search` - Hybrid search combining vector and text
- `GET /api/documents/enhanced-search` - Enhanced search with optional vector support
- `GET /api/documents/:id/similar` - Find similar documents

### Advanced Search (`/api/search`)
- `POST /api/search/text` - AI-powered text search
- `POST /api/search/image` - Image-based search with OCR
- `POST /api/search/multimodal` - Combined text and image search
- `GET /api/search/history` - User's search history
- `GET /api/search/ai-status` - Get AI agent status and quota

### Health Check (`/health`)
- `GET /health` - Basic health check
- `GET /health/ready` - Readiness probe
- `GET /health/live` - Liveness probe
- `GET /health/metrics` - System metrics

### WebSocket Events
- `connection` - Client connects to WebSocket
- `disconnect` - Client disconnects from WebSocket
- `join-room` - Join a specific room for real-time updates
- `leave-room` - Leave a specific room
- `document-processing` - Real-time document processing updates
- `processing-update` - Broadcast processing status and progress

## Development Conventions

### TypeScript & Functional Programming
- The codebase follows functional programming patterns (as specified in CLAUDE.md standards)
- Services are implemented as functional modules with dependency injection
- Type safety is maintained through comprehensive TypeScript interfaces
- Error handling is centralized through middleware

### Code Quality
- Code formatting and linting done with Biome
- TypeScript type checking enforced
- Run `bun run lint` to check code quality
- Run `bun run lint:fix` to fix linting issues
- Run `bun run format` to format code
- Run `bun run check` for TypeScript compilation and linting

### Testing
- Run `bun run test` for unit tests (though minimal test coverage currently exists)
- Test files should be located alongside source files or in a dedicated test directory

### Service Architecture
- Services are located in `/src/services/` and follow functional patterns
- Data access is handled through repositories in `/src/repositories/`
- Controllers in `/src/controllers/` handle HTTP request/response logic
- Middleware in `/src/middleware/` handles cross-cutting concerns
- Loaders in `/src/loaders/` handle service initialization and dependency injection

## Key Features

### Multi-modal Document Processing
- Support for PDFs, images, and text files
- Automatic OCR for image files
- Automatic generation of 768-dimensional embeddings using Google AI
- Real-time processing status updates via WebSocket

### Vector Search Capabilities
- MongoDB Atlas Vector Search for semantic similarity
- Hybrid search combining vector and text search
- Fallback in-app cosine similarity when Atlas is unavailable
- Configurable search parameters and weights

### AI Integration
- Google AI API integration for embeddings and generative AI
- Cost-effective with free tier limits (60 requests/minute for embeddings)
- Caching implementation to reduce API calls
- AI-powered document analysis and search capabilities

### Security Features
- JWT-based authentication with HTTP-only cookies
- Rate limiting on API endpoints
- Helmet.js for security headers
- Input validation and sanitization

## Troubleshooting

### Common Issues
1. **Database Connection**: Check MongoDB connection string in `.env`
2. **Redis Connection**: Ensure Redis server is running
3. **Google AI API**: Verify API key in `.env` and check quota limits
4. **Port Conflicts**: Check if port 3000 is available

### Debugging Commands
```bash
# Check MongoDB connection
mongosh --eval "db.adminCommand('ping')"

# Check Redis status
redis-cli ping

# List processes on port 3000
lsof -i :3000

# Run type checking
bun run check

# Clean install dependencies
rm -rf node_modules bun.lock && bun install
```