# Unified AI Agent API Documentation

## 🚀 Overview

We have transformed the RAG system into a **Unified AI Agent** that demonstrates advanced AI capabilities:

- **Intelligent Agent Router**: Automatically decides which tools to use based on user intent.
- **Multi-modal Understanding**: Processes text, PDFs, and images seamlessly.
- **Visual Reasoning**: Converts diagrams to Mermaid.js code, extracts chart data.
- **Smart Document Ingestion**: Auto-generates summaries, entities, sentiment, and categories.

The system uses **cookie-based authentication** for secure session management.

**Base URL**: `http://localhost:3000` (development) or `https://your-domain.com` (production)

---

## 🤖 Agent API

The core of the system is the Unified Agent endpoint. All AI interactions should be directed here.

### Chat with Agent
```http
POST /api/agent/chat
Content-Type: multipart/form-data
```

**Body Parameters**:
- `message` (required): The user's prompt or question.
- `sessionId` (optional): ID for continuing a conversation.
- `file` (optional): File upload (Image, PDF, etc.) for analysis.

**Example Request**:
```http
POST /api/agent/chat
Content-Type: multipart/form-data

message: "Analyze this architecture diagram and explain the data flow."
file: [architecture_diagram.png]
```

**Response**:
```json
{
  "response": "The diagram shows a microservices architecture...",
  "sessionId": "session_123",
  "toolsUsed": ["vision_analyzer", "vector_search"],
  "artifacts": [
    {
      "type": "mermaid",
      "content": "graph TD; A[Client] --> B[Load Balancer]..."
    }
  ]
}
```

---

## 🍪 Authentication

The API uses **HTTP-only cookies** for authentication.

### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

### Logout
```http
POST /api/auth/logout
```

### Get Profile
```http
GET /api/auth/profile
```

---

## 📄 Document Management

Manage the knowledge base for the RAG system.

### Upload Document
```http
POST /api/documents/upload
Content-Type: multipart/form-data

file: [PDF, Image, or Text file]
```

### List Documents
```http
GET /api/documents?page=1&limit=10
```

### Get Document Details
```http
GET /api/documents/{document_id}
```

### Delete Document
```http
DELETE /api/documents/{document_id}
```

---

## ❤️ Health Check

### System Health
```http
GET /health
```

**Response**:
```json
{
  "status": "healthy",
  "services": {
    "database": "connected",
    "redis": "connected",
    "vectorSearch": "operational"
  }
}
```