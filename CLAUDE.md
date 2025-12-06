# CLAUDE.md - AI Instructions for Enhanced RAG System

## CORE PRINCIPLES
You MUST follow these principles when generating Node.js TypeScript code:

1. **ALWAYS use camelCase** for all file names, function names, and variable names
2. **ALWAYS use functional programming patterns** - pure functions, immutability, composition
3. **ALWAYS export using object pattern**: `const serviceName = { functionName1, functionName2 }; export default serviceName;`
4. **ALWAYS import services as objects**: `import { userService } from '../services';` then use `userService.functionName()`
5. **NEVER use classes** - only functions and objects
6. **ALWAYS use TypeScript interfaces and types**
7. **ALWAYS initialize connections once in loaders** and pass instances to services

## PROJECT DIRECTORY STRUCTURE

```
src/
├── config/
│   ├── database.ts            # Database configuration (Prisma + Redis)
│   └── logger.ts              # Logger configuration
├── loaders/
│   ├── databaseLoader.ts      # MongoDB connection initialization
│   ├── redisLoader.ts         # Redis connection initialization
│   ├── expressLoader.ts       # Express app configuration
│   ├── loggerLoader.ts        # Logger setup
│   └── index.ts               # Main loader orchestrator
├── controllers/
│   ├── index.ts               # Controller aggregator
│   ├── documentController.ts  # Document business logic handlers
│   ├── authController.ts      # Auth business logic handlers
│   ├── searchController.ts    # Search business logic handlers
│   └── healthController.ts    # Health check handlers
├── routes/
│   ├── auth.ts                # Auth routes
│   ├── documents.ts           # Document routes (with vector search)
│   ├── healthRoutes.ts        # Health check routes
│   └── search.ts              # Search routes
├── services/
│   ├── aiAgentLangchain.ts    # AI agent service using LangChain
│   ├── documentProcessorService.ts  # Document processing service
│   ├── embeddingService.ts    # Vector embedding service
│   ├── queue.ts               # Queue service
│   ├── userService.ts         # User management service
│   ├── vectorIndex.ts         # Vector index service
│   ├── vectorSearchService.ts # Vector search service
│   └── index.ts               # Service aggregator
├── utils/
│   ├── constantUtils.ts       # Application constants
│   ├── errorUtils.ts          # Error handling utilities
│   ├── helperUtils.ts         # Helper functions
│   ├── responseUtils.ts       # Response formatting utilities
│   ├── validatorUtils.ts      # Validation utilities
│   └── index.ts               # Utils aggregator
├── middleware/
│   ├── authMiddleware.ts      # Authentication middleware
│   ├── errorHandlerMiddleware.ts  # Error handling middleware
│   ├── rateLimit.ts           # Rate limiting middleware
│   ├── upload.ts              # File upload middleware
│   ├── validationMiddleware.ts  # Validation middleware
│   └── index.ts               # Middleware aggregator
├── types/
│   ├── authTypes.ts           # Authentication types
│   ├── commonTypes.ts         # Common types
│   ├── documentTypes.ts       # Document types
│   ├── searchTypes.ts         # Search types
│   ├── userTypes.ts           # User types
│   └── index.ts               # Type aggregator
├── repositories/
│   ├── baseRepository.ts      # Base repository
│   ├── documentRepository.ts  # Document repository
│   ├── userRepository.ts      # User repository
│   └── index.ts               # Repository aggregator
└── main.ts                    # Application entry point
index.ts                       # Server bootstrap
package.json
tsconfig.json
biome.json
```

## MANDATORY EXPORT/IMPORT PATTERNS

### ✅ CORRECT Export Pattern:
```typescript
// userService.ts
const createUser = (userData: UserCreateData): Promise<User> => { /* logic */ };
const getUserById = (userId: string): Promise<User | null> => { /* logic */ };
const updateUser = (userId: string, data: UserUpdateData): Promise<User> => { /* logic */ };

const userService = {
  createUser,
  getUserById,
  updateUser
};

export default userService;
```

### ✅ CORRECT Import Pattern:
```typescript
// userRoutes.ts
import userService from '../services/userService';

// Usage
const user = await userService.createUser(userData);
```

### ✅ CORRECT Aggregator Pattern:
```typescript
// services/index.ts
import userService from './userService';
import productService from './productService';
import authService from './authService';

export {
  userService,
  productService,
  authService
};
```

### ❌ WRONG Patterns (NEVER USE):
```typescript
// DON'T export individual functions
export const createUser = () => {};
export const getUserById = () => {};

// DON'T use classes
export class UserService {}

// DON'T use default export with destructuring
export default { createUser, getUserById };
```

## DATABASE ARCHITECTURE

### Database Configuration (`src/config/database.ts`):
The project uses **Prisma ORM** as the primary database client with MongoDB as the database, along with **Redis** for caching:
```typescript
import { PrismaClient } from "@prisma/client";
import { createClient } from "redis";

export const prisma = new PrismaClient({
  log: ["query", "error", "info", "warn"]
});

export const redis = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379"
});
```

### Database Loader (`src/loaders/databaseLoader.ts`):
```typescript
import { type Db, MongoClient } from "mongodb";

const connectToDatabase = async (): Promise<MongoClient> => {
  const mongoUri = process.env.DATABASE_URL || "mongodb://localhost:27017/enhanced-rag-system";
  const client = new MongoClient(mongoUri);
  await client.connect();
  return client;
};

const setupConnectionPool = (_client: MongoClient): void => {
  // Connection pool is automatically managed by MongoDB Node.js driver
};

const handleConnectionEvents = (client: MongoClient): void => {
  client.on("error", (error) => { /* handle error */ });
  client.on("close", () => { /* handle close */ });
  client.on("reconnect", () => { /* handle reconnect */ });
};

const getDatabaseInstance = (client: MongoClient): Db => {
  return client.db();
};

const databaseLoader = {
  connectToDatabase,
  setupConnectionPool,
  handleConnectionEvents,
  getDatabaseInstance
};

export default databaseLoader;
```

### Main Loader (`src/loaders/index.ts`):
```typescript
interface LoaderResult {
  database: any;
  redis: any;
  logger: any;
  express: Express;
}

const initializeAllServices = async (): Promise<LoaderResult> => {
  const logger = initializeLogger();
  const express = initializeExpress();
  const database = await initializeDatabase();
  const redis = await initializeRedis();

  return { database, redis, logger, express };
};

const loaderService = {
  initializeDatabase,
  initializeRedis,
  initializeLogger,
  initializeExpress,
  initializeAllServices
};

export default loaderService;
```

## SERVICE LAYER PATTERN

### User Service (`src/services/userService.ts`):
```typescript
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { Collection } from "mongodb";
import userRepository from "../repositories/userRepository.js";
import type { TokenPayload } from "../types/authTypes.js";
import type {
  LoginCredentials,
  RegisterData,
  UserCreateData,
  UserResponse,
  UserUpdateData,
} from "../types/userTypes.js";

const createUser = async (
  userData: UserCreateData,
  collection: Collection,
): Promise<UserResponse> => { /* create logic with validation and password hashing */ };

const getUserById = async (
  userId: string,
  collection: Collection,
): Promise<UserResponse | null> => { /* get logic */ };

const loginUser = async (
  credentials: LoginCredentials,
  collection: Collection,
): Promise<{ user: UserResponse; token: string }> => { /* login logic with JWT */ };

const registerUser = async (
  registerData: RegisterData,
  collection: Collection,
): Promise<{ user: UserResponse; token: string }> => { /* registration logic */ };

const userService = {
  createUser,
  getUserById,
  getUserByEmail,
  updateUser,
  deleteUser,
  getAllUsers,
  loginUser,
  registerUser,
  generateToken,
  verifyToken,
  validateUserData,
  changePassword,
};

export default userService;
```

### Vector Search Service (`src/services/vectorSearchService.ts`):
```typescript
import type { Db, Collection } from "mongodb";

const initialize = async (database: Db, redis: any): Promise<void> => {
  // Initialize vector search capabilities
};

const performVectorSearch = async (
  queryVector: number[],
  options: {
    limit?: number;
    numCandidates?: number;
    similarity?: "cosine" | "euclidean" | "dotProduct";
  }
): Promise<any[]> => { /* vector search logic */ };

const vectorSearchService = {
  initialize,
  performVectorSearch,
  // Add other vector search methods
};

export default vectorSearchService;
```

### AI Agent Langchain Service (`src/services/aiAgentLangchain.ts`):
```typescript
const initialize = (): void => {
  // Initialize LangChain AI agent
};

const processQuery = async (query: string): Promise<any> => {
  // Process AI queries using LangChain
};

const aiAgentLangchainService = {
  initialize,
  processQuery,
  // Add other AI agent methods
};

export default aiAgentLangchainService;
```

## REPOSITORY PATTERN

### Base Repository (`src/repositories/baseRepository.ts`):
```typescript
import type { Collection, Document } from 'mongodb';

const findById = async <T>(collection: Collection, id: string): Promise<T | null> => { /* logic */ };
const findOne = async <T>(collection: Collection, query: Record<string, any>): Promise<T | null> => { /* logic */ };
const findMany = async <T>(collection: Collection, query: Record<string, any>): Promise<T[]> => { /* logic */ };
const createOne = async <T>(collection: Collection, data: Partial<T>): Promise<T> => { /* logic */ };
const updateById = async <T>(collection: Collection, id: string, data: Partial<T>): Promise<T> => { /* logic */ };
const deleteById = async (collection: Collection, id: string): Promise<boolean> => { /* logic */ };

const baseRepository = {
  findById,
  findOne,
  findMany,
  createOne,
  updateById,
  deleteById
};

export default baseRepository;
```

## UTILS PATTERN

### Helper Utils (`src/utils/helperUtils.ts`):
```typescript
const formatResponse = <T>(status: string, message: string, data?: T) => ({ status, message, data, timestamp: new Date().toISOString() });
const successResponse = <T>(message: string, data?: T) => formatResponse('success', message, data);
const errorResponse = (message: string, error?: any) => formatResponse('error', message, error);
const asyncMap = async <T, R>(array: T[], fn: (item: T) => Promise<R>): Promise<R[]> => Promise.all(array.map(fn));

const helperUtils = {
  formatResponse,
  successResponse,
  errorResponse,
  asyncMap
};

export default helperUtils;
```

## MIDDLEWARE PATTERN

### Auth Middleware (`src/middleware/authMiddleware.ts`):

**IMPORTANT: This project uses COOKIE-BASED AUTHENTICATION, not token-based authentication.**

```typescript
import type { NextFunction, Request, Response } from 'express';
import type { AuthenticatedRequest } from '../types/authTypes';

// Cookie-based authentication (reads JWT from cookies)
const authenticateCookie = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  /* Reads token from req.cookies.token and verifies it */
};

const authorizeRoles = (roles: string[]) => (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  /* Checks if authenticated user has required role */
};

const validateApiKey = (req: Request, res: Response, next: NextFunction): void => {
  /* Validates API key from headers for API access */
};

const optionalAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  /* Optionally authenticates but doesn't fail if no cookie present */
};

// Pre-configured middleware functions
const requireAuth = createAuthMiddleware({ requireAuth: true });
const requireAdmin = createAuthMiddleware({ requireAuth: true, allowedRoles: ['ADMIN'] });
const requireModeratorOrAdmin = createAuthMiddleware({ requireAuth: true, allowedRoles: ['ADMIN', 'MODERATOR'] });
const optionalAuthMiddleware = createAuthMiddleware({ requireAuth: false });
const apiKeyAuth = createAuthMiddleware({ requireAuth: true, allowApiKeys: true });

export const authMiddleware = {
  authenticateCookie,
  authorizeRoles,
  validateApiKey,
  optionalAuth,
  requireAuth,           // ← USE THIS for protected routes
  requireAdmin,          // ← USE THIS for admin-only routes
  requireModeratorOrAdmin,
  optionalAuthMiddleware,
  apiKeyAuth
};
```

**Authentication Pattern:**
- ✅ **ALWAYS use `authMiddleware.requireAuth`** for protected routes
- ✅ **ALWAYS use `authMiddleware.requireAdmin`** for admin-only routes
- ✅ **NEVER use `authMiddleware.authenticateToken`** - it doesn't exist
- Authentication reads JWT from HTTP-only cookies, not from Authorization headers
- Cookies are set automatically on login/register

### Rate Limit Middleware (`src/middleware/rateLimit.ts`):

**IMPORTANT: Use the correct rate limit middleware for each route type.**

```typescript
const rateLimitMiddleware = {
  generalRateLimit,      // ← General API endpoints (100 req/15min)
  uploadRateLimit,       // ← File upload endpoints (5 req/min)
  aiQueryRateLimit,      // ← AI/Search queries (10 req/min)
  authRateLimit          // ← Auth endpoints (5 req/15min)
};

export default rateLimitMiddleware;
```

**Rate Limit Pattern:**
- ✅ **ALWAYS use `rateLimitMiddleware.uploadRateLimit`** for file upload routes
- ✅ **ALWAYS use `rateLimitMiddleware.aiQueryRateLimit`** for AI/search/vision routes
- ✅ **ALWAYS use `rateLimitMiddleware.authRateLimit`** for login/register routes
- ✅ **ALWAYS use `rateLimitMiddleware.generalRateLimit`** for general API routes
- ✅ **NEVER use `rateLimitMiddleware.searchRateLimit`** - it doesn't exist

## TYPE DEFINITIONS

### User Types (`src/types/userTypes.ts`):
```typescript
export interface User {
  id: string;
  name: string;
  email: string;
  age?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserCreateData {
  name: string;
  email: string;
  age?: number;
}

export interface UserUpdateData {
  name?: string;
  email?: string;
  age?: number;
}

export type UserRole = 'admin' | 'user' | 'moderator';
```

## CONTROLLER PATTERN

### Document Controller (`src/controllers/documentController.ts`):
```typescript
import { Request, Response } from 'express';
import { documentProcessorService, embeddingService, vectorSearchService } from '../services';
import { logger } from '../config/logger';
import type { AuthenticatedRequest } from '../types/authTypes';

const uploadDocumentHandler = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Business logic for document upload
    const processedDoc = await documentProcessorService.processDocument(/* params */);

    res.status(201).json({
      message: "Document uploaded successfully",
      document: processedDoc
    });
  } catch (error) {
    logger.error("Document upload error:", error);
    res.status(500).json({ error: "Failed to process document" });
  }
};

const vectorSearchHandler = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { query, limit = 10, numCandidates = 50, similarity = "cosine" } = req.query;

    // Vector search logic
    const results = await vectorSearchService.performVectorSearch(/* params */);

    res.json({ results });
  } catch (error) {
    logger.error("Vector search error:", error);
    res.status(500).json({ error: "Failed to perform vector search" });
  }
};

const hybridSearchHandler = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Hybrid search combining vector and text search
    const results = await /* hybrid search logic */;

    res.json({ results });
  } catch (error) {
    logger.error("Hybrid search error:", error);
    res.status(500).json({ error: "Failed to perform hybrid search" });
  }
};

const documentController = {
  uploadDocumentHandler,
  batchUploadHandler,
  getDocumentsHandler,
  getDocumentHandler,
  updateDocumentHandler,
  deleteDocumentHandler,
  vectorSearchHandler,
  hybridSearchHandler,
  enhancedSearchHandler,
  findSimilarDocumentsHandler,
  searchStatsHandler
};

export default documentController;
```

## ROUTE PATTERN

### Document Routes (`src/routes/documents.ts`):
```typescript
import express from "express";
import { body, query } from "express-validator";
import { documentController } from "../controllers/index.js";
import authMiddleware from "../middleware/authMiddleware.js";
import rateLimitMiddleware from "../middleware/rateLimit.js";
import uploadMiddleware from "../middleware/upload.js";

const router = express.Router();

// Apply cookie-based authentication to all routes
router.use(authMiddleware.requireAuth);

// Upload single document
router.post(
  "/upload",
  rateLimitMiddleware.uploadRateLimit,
  uploadMiddleware.uploadSingle,
  uploadMiddleware.handleUploadError,
  documentController.uploadDocumentHandler,
);

// Vector Search Routes
router.get(
  "/vector-search",
  [
    query("query").notEmpty().withMessage("Search query is required"),
    query("limit").optional().isInt({ min: 1, max: 50 }),
    query("numCandidates").optional().isInt({ min: 10, max: 200 }),
    query("similarity").optional().isIn(["cosine", "euclidean", "dotProduct"]),
  ],
  documentController.vectorSearchHandler,
);

// Hybrid search combining vector and text search
router.get(
  "/hybrid-search",
  [
    query("query").notEmpty().withMessage("Search query is required"),
    query("limit").optional().isInt({ min: 1, max: 50 }),
    query("textWeight").optional().isFloat({ min: 0, max: 1 }),
    query("vectorWeight").optional().isFloat({ min: 0, max: 1 }),
  ],
  documentController.hybridSearchHandler,
);

// Get single document
router.get("/:id", documentController.getDocumentHandler);

// Delete document
router.delete("/:id", documentController.deleteDocumentHandler);

export default router;
```

## APPLICATION ENTRY POINT

### Main Application (`src/main.ts`):
```typescript
import { createServer } from "node:http";
import { Server as SocketIOServer } from "socket.io";
import { logger } from "./config/logger.js";
import loaderService from "./loaders/index.js";
import errorHandlerMiddleware from "./middleware/errorHandlerMiddleware.js";
import authRoutes from "./routes/auth.js";
import documentRoutes from "./routes/documents.js";
import healthRoutes from "./routes/healthRoutes.js";
import searchRoutes from "./routes/search.js";

const startServer = async () => {
  // Initialize all services
  const { database, redis, logger, express } =
    await loaderService.initializeAllServices();

  // Initialize application services with database and redis
  const db = database.db();
  await embeddingService.initializeModel();
  await vectorSearchService.initialize(db, redis);
  aiAgentLangchainService.initialize();

  // Create HTTP server
  const server = createServer(express);
  const io = new SocketIOServer(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:3001",
      methods: ["GET", "POST"],
    },
  });

  // Setup WebSocket handlers
  setupWebSocketHandlers(io, logger);

  // API routes
  express.use("/api/auth", authRoutes);
  express.use("/api/documents", documentRoutes);
  express.use("/api/search", searchRoutes);
  express.use("/health", healthRoutes.setupHealthRoutes());

  // Error handling
  express.use(errorHandlerMiddleware.notFoundHandler);
  express.use(errorHandlerMiddleware.errorHandler);

  // Start server
  server.listen(APP_CONFIG.PORT, () => {
    logger.info(`🚀 Enhanced RAG System server running on port ${APP_CONFIG.PORT}`);
  });
};

startServer().catch(console.error);
```

### Bootstrap (`index.ts`):
```typescript
import "./src/main";
```

## ENHANCED RAG SYSTEM FEATURES

### Core Capabilities:
- **Multi-modal Document Processing**: Support for PDF, images (OCR), and text files
- **Vector Search**: Advanced semantic search using embeddings
- **Hybrid Search**: Combines traditional text search with vector search
- **AI Agent Integration**: LangChain-based AI agent for intelligent query processing
- **Real-time Communication**: WebSocket support for live updates
- **Authentication & Authorization**: JWT-based auth with role-based access control
- **File Upload Handling**: Multi-file upload with validation and processing

### Technology Stack:
- **Runtime**: Bun (Node.js-compatible)
- **Framework**: Express.js
- **Database**: MongoDB with Prisma ORM
- **Cache**: Redis
- **AI/ML**:
  - LangChain for AI agent functionality
  - Google Generative AI integration for embeddings and generative AI
  - Tesseract.js for OCR
- **Validation**: express-validator + class-validator
- **File Processing**:
  - pdf-parse for PDF processing
  - sharp for image processing
  - multer for file uploads
- **Real-time**: Socket.IO
- **Logging**: Winston
- **Tooling**: Biome for linting and formatting

## CRITICAL RULES

1. **NEVER initialize database connections in services** - always receive initialized instances from loaders
2. **ALWAYS use TypeScript interfaces** for all data structures
3. **ALWAYS return typed responses** from functions
4. **ALWAYS use async/await** instead of promises chains
5. **ALWAYS validate input data** using functional validators
6. **ALWAYS handle errors** using functional error handling patterns
7. **NEVER mutate objects** - always return new objects
8. **ALWAYS use pure functions** where possible
9. **ALWAYS aggregate exports** in index.ts files
10. **ALWAYS use camelCase** for everything (files, functions, variables)
11. **ALWAYS run type checking and linting** with `bun run check` before committing changes
12. **USE ESM MODULES** - All imports/exports must use `.js` extensions for TypeScript compatibility

## INITIALIZATION FLOW

1. `index.ts` → Bootstrap (imports main.ts)
2. `src/main.ts` → Entry point (server initialization)
3. `loaders/index.ts` → Initialize all connections (MongoDB, Redis, Logger, Express)
4. Service initialization (embedding service, vector search, AI agent)
5. Route mounting and middleware setup
6. WebSocket handlers setup
7. Server starts only after all loaders complete

## DEVELOPMENT COMMANDS

```bash
# Development
bun run dev                    # Start with hot reload
bun run start:dev             # Start in development mode

# Building
bun run build                  # Build for production
bun run start                  # Start production server
bun run prod                   # Build and start production

# Database
bun run db:generate           # Generate Prisma client
bun run db:push               # Push schema to database
bun run db:migrate            # Run migrations
bun run db:studio             # Open Prisma Studio

# Code Quality
bun run check                 # Type checking + linting
bun run lint                  # Run Biome linter
bun run lint:fix              # Fix linting issues
bun run format                # Format code with Biome

# Testing
bun run test                  # Run tests
```

This pattern ensures clean separation, testability, and scalability while maintaining functional programming principles for the Enhanced RAG System.