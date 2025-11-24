# Unified AI Agent (formerly Enhanced RAG System)

> **A production-grade, multi-modal AI Agent system built with Node.js, TypeScript, and Google Gemini.**

This project transforms a traditional RAG (Retrieval-Augmented Generation) system into a **Unified AI Agent** capable of intelligent reasoning, multi-modal processing, and autonomous tool selection. It leverages Google's state-of-the-art Gemini models for both vision and language tasks, backed by a robust vector search infrastructure.

---

## 🏗️ Technical Architecture

The system follows a modular **Service-Repository-Controller** architecture, designed for scalability and maintainability.

```mermaid
graph TD
    Client[Client / Frontend] -->|HTTP/WebSocket| API[Express API Gateway]
    
    subgraph "Unified Agent Layer"
        API -->|/api/agent| Agent[LangChain Agent]
        Agent -->|Decides Tool| Router{Intelligent Router}
    end
    
    subgraph "Tools & Services"
        Router -->|Text Query| VectorService[Vector Search Service]
        Router -->|Image/PDF| VisionService[Gemini Vision Service]
        Router -->|Doc Processing| DocService[Document Processor]
        Router -->|Summarization| SummaryService[Summarization Service]
    end
    
    subgraph "Data Layer"
        VectorService -->|Embeddings (768d)| Atlas[MongoDB Atlas Vector Search]
        DocService -->|Metadata| Mongo[MongoDB]
        API -->|Caching| Redis[Redis]
    end
    
    subgraph "AI Models"
        VisionService -->|Vision API| GeminiProVision[Gemini Pro Vision]
        VectorService -->|Embedding API| Embedding004[text-embedding-004]
        Agent -->|Reasoning| GeminiPro[Gemini Pro]
    end
```

### Core Components

1.  **Intelligent Agent Router (`aiAgentLangchain.ts`)**
    *   Acts as the central "brain" of the system.
    *   Uses LangChain to interpret user intent from natural language.
    *   Dynamically selects the appropriate tool (e.g., "Search knowledge base", "Analyze image", "Summarize document") based on the query.

2.  **Multi-modal Ingestion Engine**
    *   **PDFs**: Parsed using `pdf-parse` for text extraction.
    *   **Images**: Processed via `sharp` and analyzed using Google's Gemini Vision for OCR and scene understanding.
    *   **Text**: Automatically chunked and embedded.

3.  **Vector Search Infrastructure**
    *   **Model**: Google `text-embedding-004`.
    *   **Dimensions**: 768-dimensional vectors.
    *   **Storage**: MongoDB Atlas Vector Search.
    *   **Strategy**: Hybrid search combining semantic vector similarity (Cosine) with keyword filtering.

---

## 🚀 Key Capabilities

### 🧠 Intelligent Reasoning
The agent doesn't just search; it *understands*.
*   **Query**: "What does the chart on page 5 say about Q3 revenue?"
*   **Action**: The agent locates page 5, extracts the chart image, uses the Vision tool to interpret the data, and formulates a natural language answer.

### 👁️ Visual Intelligence
*   **Diagram-to-Code**: Converts flowchart images into Mermaid.js code.
*   **Chart Extraction**: Extracts raw data points from images of bar charts, line graphs, etc.
*   **Visual QA**: Answers questions based on visual content.

### 📚 Smart Knowledge Base
*   **Auto-Categorization**: Automatically tags documents based on content.
*   **Entity Extraction**: Identifies key people, organizations, and dates.
*   **Semantic Search**: Finds relevant information even if keywords don't match exactly.

### 💬 Chat History & Analytics
*   **Persistent Conversations**: Automatically saves all agent interactions for continuity.
*   **Usage Metrics**: Tracks key metrics for auditing, performance analysis, and insights.

---

## 🛠️ Technology Stack

*   **Runtime**: [Bun](https://bun.sh) (v1.2+) - High-performance JavaScript runtime.
*   **Backend**: Node.js / Express - Robust API framework.
*   **Language**: TypeScript - Type-safe development.
*   **Database**:
    *   **MongoDB**: Primary data store and Vector Search engine.
    *   **Redis**: High-speed caching for sessions and API responses.
*   **AI & ML**:
    *   **LangChain**: Framework for building agentic applications.
    *   **Google Gemini**: LLM for reasoning and vision.
    *   **Google Embeddings**: `text-embedding-004` for vectorization.

---

## ⚡ Setup & Installation

### Prerequisites
*   Bun runtime
*   Docker & Docker Compose
*   Google AI API Key

### 1. Environment Configuration
Copy the example environment file:
```bash
cp .env.example .env
```

Configure the following critical variables in `.env`:
```env
# Database
DATABASE_URL="mongodb://localhost:27017/enhanced-rag-system"
REDIS_URL="redis://localhost:6379"

# AI Configuration
GOOGLE_AI_API_KEY="your_google_ai_key"

# Security
JWT_SECRET="your_secure_secret"
```

### 2. Install Dependencies
```bash
bun install
```

### 3. Start Infrastructure
Use Docker to spin up local MongoDB and Redis instances:
```bash
docker-compose up -d
```

### 4. Run the Application
```bash
# Development mode with hot-reload
bun run dev

# Production build
bun run build
bun run start
```

---

## 🔌 API Reference

### Agent Interaction
**Endpoint**: `POST /api/agent/chat`
**Description**: Unified endpoint for all AI interactions.
```bash
curl -X POST http://localhost:3000/api/agent/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Summarize the last uploaded contract",
    "sessionId": "session_123"
  }'
```

### API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/agent/chat` | Send a message to the unified agent (supports text & images) |
| `GET` | `/api/agent/history` | Retrieve chat history for the authenticated user |
| `GET` | `/api/agent/analytics` | Retrieve system analytics (Admin) |

### Document Management
*   `POST /api/documents/upload`: Upload and process files.
*   `GET /api/documents`: List and filter documents.
*   `DELETE /api/documents/:id`: Remove documents and their embeddings.

### Authentication
*   `POST /api/auth/register`: Create a new account.
*   `POST /api/auth/login`: Authenticate and receive a session cookie.

---

## 🧪 Testing

Run the comprehensive test suite:
```bash
bun run test
```

## 📄 License

Private and Proprietary.