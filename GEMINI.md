# CLAUDE.md - AI Instructions for Unified AI Agent

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
├── config/            # Configuration (Database, Logger)
├── loaders/           # Initialization (Mongo, Redis, Express)
├── controllers/       # Route Handlers (Agent, Auth, Document)
├── routes/            # API Definitions (Agent, Auth, Document)
├── services/          # Business Logic
│   ├── aiAgentLangchain.ts    # CORE: Main Agent Orchestrator
│   ├── geminiVisionService.ts # Vision & Image Analysis
│   ├── documentProcessorService.ts
│   ├── documentCategorizationService.ts
│   ├── embeddingService.ts
│   ├── summarizationService.ts
│   ├── userService.ts
│   ├── vectorSearchService.ts
│   └── ...
├── utils/             # Helpers & Constants
├── middleware/        # Auth, Validation, Error Handling
├── types/             # TypeScript Interfaces
├── repositories/      # Data Access Layer
└── main.ts            # Entry Point
```

## ARCHITECTURE: UNIFIED AGENT

The system is designed around a **Unified AI Agent**. Instead of disparate endpoints for specific AI tasks, the Agent Service (`aiAgentLangchain.ts`) acts as the central brain.

### Agent Pattern
- **Router**: The agent analyzes the user query to determine intent.
- **Tools**: It delegates to specific services (Vision, Vector Search, Summarization) as "tools".
- **Context**: It maintains conversation history and context.

### Service Layer Pattern (`src/services/aiAgentLangchain.ts`)
```typescript
const initialize = (): void => {
  // Initialize LangChain Agent with tools
};

const processAgentMessage = async (query: string, context: any, file?: any): Promise<AgentResponse> => {
  // 1. Analyze intent
  // 2. Select tool (e.g., Vector Search, Vision)
  // 3. Execute and format response
};

const aiAgentLangchainService = {
  initialize,
  processAgentMessage,
};

export default aiAgentLangchainService;
```

## MANDATORY EXPORT/IMPORT PATTERNS

### ✅ CORRECT Export Pattern:
```typescript
// userService.ts
const createUser = (userData: UserCreateData): Promise<User> => { /* logic */ };

const userService = {
  createUser,
};

export default userService;
```

### ✅ CORRECT Import Pattern:
```typescript
// agentController.ts
import { aiAgentLangchainService } from '../services';

const handleChat = async (req, res) => {
  const response = await aiAgentLangchainService.processQuery(req.body.message);
  res.json(response);
};
```

## DATABASE ARCHITECTURE

- **Primary**: MongoDB (Metadata, User Data)
- **Vector Store**: MongoDB Atlas Vector Search (768-dim embeddings via Google `text-embedding-004`)
- **Cache**: Redis (Session, API Response Caching)

## CRITICAL RULES

1. **NEVER initialize database connections in services** - always receive initialized instances from loaders.
2. **ALWAYS use TypeScript interfaces** for all data structures.
3. **ALWAYS return typed responses** from functions.
4. **ALWAYS use async/await** instead of promises chains.
5. **ALWAYS validate input data** using functional validators.
6. **ALWAYS handle errors** using functional error handling patterns.
7. **NEVER mutate objects** - always return new objects.
8. **ALWAYS use pure functions** where possible.
9. **ALWAYS aggregate exports** in index.ts files.
10. **ALWAYS use camelCase** for everything.
11. **ALWAYS run type checking** with `bun run check`.