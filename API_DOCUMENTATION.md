# Enhanced RAG System API Documentation

## 🚀 Overview

The Enhanced RAG System provides a RESTful API for document processing, vector search, and AI-powered content retrieval. The system uses **cookie-based authentication** for secure session management.

**Base URL**: `http://localhost:3000` (development) or `https://your-domain.com` (production)

## 🍪 Authentication

The API uses **HTTP-only cookies** for authentication. No need to pass Authorization headers!

### How Authentication Works:
1. **Login/Register**: Server sets an HTTP-only `token` cookie
2. **Authenticated Requests**: Browser automatically includes the cookie
3. **Logout**: Server clears the cookie

---

## 🔐 Authentication Endpoints

### Register New User
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Response**:
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "USER",
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
}
```
*Cookie automatically set by server*

---

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response**:
```json
{
  "message": "Login successful",
  "user": {
    "id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "USER"
  }
}
```
*Cookie automatically set by server*

---

### Get Current User Profile
```http
GET /api/auth/profile
```

**Response**:
```json
{
  "user": {
    "id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "USER",
    "createdAt": "2025-01-01T00:00:00.000Z",
    "_count": {
      "documents": 5,
      "queries": 12
    }
  }
}
```

---

### Logout
```http
POST /api/auth/logout
```

**Response**:
```json
{
  "message": "Logout successful"
}
```
*Cookie automatically cleared by server*

---

## 📄 Document Management Endpoints

### Upload Single Document
```http
POST /api/documents/upload
Content-Type: multipart/form-data

file: [PDF, Image, or Text file]
```

**Response**:
```json
{
  "message": "Document uploaded successfully",
  "document": {
    "id": "doc_id",
    "title": "Document Title",
    "fileType": "pdf",
    "fileSize": 1024000,
    "status": "processed",
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
}
```

---

### Upload Multiple Documents
```http
POST /api/documents/batch-upload
Content-Type: multipart/form-data

files: [Multiple files]
```

**Response**:
```json
{
  "message": "Batch upload completed",
  "results": [
    {
      "id": "doc_id_1",
      "title": "Document 1",
      "status": "processed"
    },
    {
      "id": "doc_id_2",
      "title": "Document 2",
      "status": "processed"
    }
  ],
  "summary": {
    "total": 2,
    "successful": 2,
    "failed": 0
  }
}
```

---

### Get User Documents
```http
GET /api/documents?page=1&limit=10&search=keyword&fileType=pdf&sortBy=createdAt&sortOrder=desc
```

**Query Parameters**:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 100)
- `search` (optional): Search keyword
- `fileType` (optional): Filter by file type (pdf, txt, jpg, etc.)
- `sortBy` (optional): Sort field (createdAt, title, fileSize)
- `sortOrder` (optional): Sort order (asc, desc)

**Response**:
```json
{
  "documents": [
    {
      "id": "doc_id",
      "title": "Document Title",
      "fileType": "pdf",
      "fileSize": 1024000,
      "status": "processed",
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  }
}
```

---

### Get Single Document
```http
GET /api/documents/{document_id}
```

**Response**:
```json
{
  "document": {
    "id": "doc_id",
    "title": "Document Title",
    "content": "Document content...",
    "fileType": "pdf",
    "fileSize": 1024000,
    "status": "processed",
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
}
```

---

### Update Document Metadata
```http
PATCH /api/documents/{document_id}
Content-Type: application/json

{
  "title": "Updated Title",
  "summary": "Updated summary"
}
```

**Response**:
```json
{
  "message": "Document updated successfully",
  "document": {
    "id": "doc_id",
    "title": "Updated Title",
    "summary": "Updated summary",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  }
}
```

---

### Delete Document
```http
DELETE /api/documents/{document_id}
```

**Response**:
```json
{
  "message": "Document deleted successfully"
}
```

---

## 🔍 Search Endpoints

### Vector Search (Semantic Search)
```http
GET /api/documents/vector-search?query=your search query&limit=10&similarity=cosine
```

**Query Parameters**:
- `query` (required): Search query
- `limit` (optional): Number of results (default: 10, max: 50)
- `similarity` (optional): Similarity metric (cosine, euclidean, dotProduct)
- `numCandidates` (optional): Candidate count (default: 50, max: 200)

**Response**:
```json
{
  "results": [
    {
      "document": {
        "id": "doc_id",
        "title": "Document Title",
        "content": "Relevant content...",
        "score": 0.95
      },
      "metadata": {
        "fileType": "pdf",
        "createdAt": "2025-01-01T00:00:00.000Z"
      }
    }
  ],
  "query": "your search query",
  "totalResults": 5
}
```

---

### Hybrid Search (Text + Vector)
```http
GET /api/documents/hybrid-search?query=search term&limit=10&textWeight=0.3&vectorWeight=0.7
```

**Query Parameters**:
- `query` (required): Search query
- `limit` (optional): Number of results (default: 10, max: 50)
- `textWeight` (optional): Text search weight (0.0-1.0, default: 0.5)
- `vectorWeight` (optional): Vector search weight (0.0-1.0, default: 0.5)

---

### Enhanced Search
```http
GET /api/documents/enhanced-search?query=search term&useVector=true&vectorWeight=0.7&fileType=pdf
```

**Query Parameters**:
- `query` (required): Search query
- `useVector` (optional): Enable vector search (default: true)
- `vectorWeight` (optional): Vector search weight (0.0-1.0)
- `fileType` (optional): Filter by file type
- `page` (optional): Page number
- `limit` (optional): Results per page

---

### Find Similar Documents
```http
GET /api/documents/{document_id}/similar?limit=10&numCandidates=50
```

**Response**:
```json
{
  "similarDocuments": [
    {
      "document": {
        "id": "doc_id",
        "title": "Similar Document",
        "similarity": 0.89
      }
    }
  ]
}
```

---

### AI-Powered Search
```http
POST /api/search/text
Content-Type: application/json

{
  "query": "What are the main benefits of microservices?",
  "filters": {
    "fileType": "pdf",
    "dateRange": {
      "start": "2025-01-01",
      "end": "2025-12-31"
    }
  },
  "limit": 10
}
```

**Response**:
```json
{
  "results": [
    {
      "content": "Relevant content snippet...",
      "document": {
        "id": "doc_id",
        "title": "Document Title",
        "fileType": "pdf"
      },
      "score": 0.92,
      "highlights": ["main benefits", "microservices"]
    }
  ],
  "queryInfo": {
    "query": "What are the main benefits of microservices?",
    "totalResults": 3,
    "processingTime": "0.5s"
  }
}
```

---

### Image Search
```http
POST /api/search/image
Content-Type: multipart/form-data

file: [Image file]
query: "What's in this image?" (optional)
```

**Response**:
```json
{
  "results": [
    {
      "document": {
        "id": "doc_id",
        "title": "Related Document",
        "imageMatches": [
          {
            "imageId": "img_id",
            "confidence": 0.87,
            "description": "Architecture diagram"
          }
        ]
      }
    }
  ]
}
```

---

### Multimodal Search (Text + Image)
```http
POST /api/search/multimodal
Content-Type: multipart/form-data

file: [Image file]
query: "Find similar diagrams and explain them"
```

---

### Search History
```http
GET /api/search/history?page=1&limit=20&queryType=TEXT
```

**Response**:
```json
{
  "history": [
    {
      "id": "search_id",
      "query": "search term",
      "queryType": "TEXT",
      "resultsCount": 5,
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50
  }
}
```

---

### AI Status and Quota
```http
GET /api/search/ai-status
```

**Response**:
```json
{
  "status": {
    "aiAgentEnabled": true,
    "quotaUsed": 45,
    "quotaLimit": 100,
    "quotaRemaining": 55,
    "resetDate": "2025-02-01T00:00:00.000Z"
  }
}
```

---

## 📊 Analytics Endpoints

### Search Statistics
```http
GET /api/documents/search-stats
```

**Response**:
```json
{
  "stats": {
    "totalDocuments": 150,
    "totalSearches": 1250,
    "averageResponseTime": "0.3s",
    "popularQueries": [
      { "query": "microservices", "count": 45 },
      { "query": "architecture", "count": 32 }
    ],
    "fileTypeDistribution": {
      "pdf": 60,
      "txt": 25,
      "jpg": 15
    }
  }
}
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
  "timestamp": "2025-01-01T00:00:00.000Z",
  "version": "1.0.0",
  "environment": "production",
  "services": {
    "database": "connected",
    "redis": "connected",
    "vectorSearch": "operational"
  }
}
```

---

## 🚨 Error Responses

All endpoints return consistent error responses:

```json
{
  "status": "error",
  "message": "Error description",
  "data": {
    "type": "ErrorType",
    "statusCode": 400
  },
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

### Common HTTP Status Codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Authentication Required
- `403` - Forbidden
- `404` - Not Found
- `429` - Rate Limited
- `500` - Internal Server Error

---

## 🔧 Frontend Integration Examples

### Using Fetch API
```javascript
// Login
const login = async (email, password) => {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Important for cookies!
    body: JSON.stringify({ email, password })
  });
  return response.json();
};

// Get documents
const getDocuments = async (page = 1, search = '') => {
  const response = await fetch(`/api/documents?page=${page}&search=${search}`, {
    credentials: 'include' // Important for cookies!
  });
  return response.json();
};

// Upload document
const uploadDocument = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/documents/upload', {
    method: 'POST',
    credentials: 'include', // Important for cookies!
    body: formData
  });
  return response.json();
};
```

### Using Axios
```javascript
import axios from 'axios';

// Configure axios to always include cookies
const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  withCredentials: true // Important for cookies!
});

// Login
const login = async (email, password) => {
  const response = await api.post('/auth/login', { email, password });
  return response.data;
};

// Get documents
const getDocuments = async (params) => {
  const response = await api.get('/documents', { params });
  return response.data;
};
```

---

## 🍪 Important Cookie Notes

1. **Automatic Handling**: Browser automatically includes cookies in requests
2. **HTTP-Only**: Cookies cannot be accessed via JavaScript (security)
3. **Secure**: In production, cookies only sent over HTTPS
4. **SameSite**: Protection against CSRF attacks
5. **No Authorization Headers**: Don't manually pass tokens in headers

---

## 📝 Development Notes

- **Rate Limiting**: Auth endpoints have stricter rate limits
- **File Upload**: Max file size is 10MB per file
- **Supported Formats**: PDF, TXT, JPG, PNG, GIF, WebP, BMP
- **Vector Search**: Automatic embedding generation for uploaded documents
- **AI Features**: Limited quota for AI-powered searches

---

## 🆘 Support

For issues or questions:
1. Check the health endpoint: `GET /health`
2. Review error messages for specific details
3. Ensure cookies are enabled in your browser
4. Verify CORS settings for cross-origin requests