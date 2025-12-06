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

### `POST /api/agent/chat`

**Description**:
The primary endpoint for interacting with the Unified AI Agent. It supports multi-modal input (text and optional file uploads) and leverages various tools internally to generate an intelligent response.

**Authentication**: Required (cookie-based)
**Rate Limiting**: Applied per user.

**Request**:
- **Method**: `POST`
- **URL**: `/api/agent/chat`
- **Content-Type**: `multipart/form-data`

**Body Parameters**:
| Parameter | Type   | Required | Description                                                                                             | Example               |
| :-------- | :----- | :------- | :------------------------------------------------------------------------------------------------------ | :-------------------- |
| `message` | `string` | Yes      | The user's prompt or question for the AI agent.                                                         | `"Summarize this document"` |
| `sessionId` | `string` | No       | An optional identifier to maintain conversation context across multiple requests.                       | `"session_abc123"`    |
| `file`    | `file`   | No       | An optional file to upload for analysis (e.g., `image/png`, `application/pdf`). Processed by Multer. | `[architecture_diagram.png]` |

**Example Request**:

```http
POST /api/agent/chat
Content-Type: multipart/form-data

message: "Analyze this architecture diagram and explain the data flow."
file: [architecture_diagram.png]
```

**Success Response (`200 OK`)**:

```json
{
  "success": true,
  "response": "The diagram illustrates a microservices architecture employing event-driven communication...",
  "toolsUsed": ["vision_analysis", "general_knowledge"],
  "sessionId": "session_abc123"
}
```

**Response Properties**:
| Property    | Type      | Description                                                                 |
| :---------- | :-------- | :-------------------------------------------------------------------------- |
| `success`   | `boolean`   | Indicates if the request was successful.                                    |
| `response`  | `string`    | The AI agent's generated response to the user's query.                      |
| `toolsUsed` | `string[]`  | An array of internal tools utilized by the agent to process the request.    |
| `sessionId` | `string`    | The session ID, useful for continuing a conversation context.               |

**Error Responses**:

-   **`400 Bad Request`**: If required parameters are missing or validation fails.
    ```json
    {
      "errors": [
        {
          "type": "field",
          "value": "",
          "msg": "Message is required",
          "path": "message",
          "location": "body"
        }
      ]
    }
    ```
    or
    ```json
    {
      "error": "No file uploaded"
    }
    ```
-   **`401 Unauthorized`**: If authentication cookie is missing or invalid.
    ```json
    {
      "error": "Authentication required"
    }
    ```
-   **`500 Internal Server Error`**: For unexpected server-side issues.
    ```json
    {
      "error": "Agent failed to process request"
    }
    ```

### `GET /api/agent/history`

**Description**:
Retrieves the chat history for the authenticated user.

**Authentication**: Required (cookie-based)

**Request**:
- **Method**: `GET`
- **URL**: `/api/agent/history`

**Success Response (`200 OK`)**:

```json
{
  "history": [
    {
      "id": "chat_entry_id_1",
      "userId": "user_id_123",
      "message": "Hello, AI!",
      "response": "Hello! How can I assist you today?",
      "sessionId": "session_abc123",
      "toolsUsed": ["general_knowledge"],
      "createdAt": "2023-10-27T10:00:00.000Z",
      "updatedAt": "2023-10-27T10:00:00.000Z"
    },
    {
      "id": "chat_entry_id_2",
      "userId": "user_id_123",
      "message": "What is the capital of France?",
      "response": "The capital of France is Paris.",
      "sessionId": "session_abc123",
      "toolsUsed": ["general_knowledge"],
      "createdAt": "2023-10-27T10:01:00.000Z",
      "updatedAt": "2023-10-27T10:01:00.000Z"
    }
  ]
}
```

**Response Properties**:
| Property    | Type                 | Description                                    |
| :---------- | :------------------- | :--------------------------------------------- |
| `history`   | `ChatHistoryEntry[]` | An array of chat history objects.              |
| `id`        | `string`             | Unique identifier for the chat entry.          |
| `userId`    | `string`             | The ID of the user who made the query.         |
| `message`   | `string`             | The user's original message.                   |
| `response`  | `string`             | The AI agent's response.                       |
| `sessionId` | `string`             | The session ID for the conversation.           |
| `toolsUsed` | `string[]`           | List of tools used for this specific entry.    |
| `createdAt` | `string`             | ISO 8601 timestamp of creation.                |
| `updatedAt` | `string`             | ISO 8601 timestamp of last update.             |

**Error Responses**:

-   **`401 Unauthorized`**: If authentication cookie is missing or invalid.
-   **`500 Internal Server Error`**: For unexpected server-side issues.

### `GET /api/agent/analytics`

**Description**:
Retrieves analytics data related to agent usage. (Note: In a production environment, this endpoint would typically be restricted to administrators).

**Authentication**: Required (cookie-based)

**Request**:
- **Method**: `GET`
- **URL**: `/api/agent/analytics`

**Success Response (`200 OK`)**:

```json
{
  "analytics": [
    {
      "id": "analytics_id_1",
      "metricType": "agent_query",
      "value": 1,
      "metadata": {
        "userId": "user_id_123",
        "toolsUsed": ["vision_analysis"],
        "hasFile": true
      },
      "timestamp": "2023-10-27T10:05:00.000Z"
    },
    {
      "id": "analytics_id_2",
      "metricType": "agent_query",
      "value": 1,
      "metadata": {
        "userId": "user_id_456",
        "toolsUsed": ["vector_search", "general_knowledge"],
        "hasFile": false
      },
      "timestamp": "2023-10-27T10:06:00.000Z"
    }
  ]
}
```

**Response Properties**:
| Property     | Type          | Description                                                              |
| :----------- | :------------ | :----------------------------------------------------------------------- |
| `analytics`  | `Analytics[]` | An array of analytics event objects.                                     |
| `id`         | `string`      | Unique identifier for the analytics entry.                               |
| `metricType` | `string`      | Type of metric (e.g., "agent_query").                                    |
| `value`      | `number`      | Numeric value associated with the metric.                                |
| `metadata`   | `object`      | Additional JSON data about the event (e.g., `userId`, `toolsUsed`). |
| `timestamp`  | `string`      | ISO 8601 timestamp of the event.                                         |

**Error Responses**:

-   **`401 Unauthorized`**: If authentication cookie is missing or invalid.
-   **`500 Internal Server Error`**: For unexpected server-side issues.

---

## 🍪 Authentication

The API uses **HTTP-only cookies** for authentication. After a successful login or registration, a JWT token is stored in an HTTP-only cookie on the client's browser. This cookie is automatically sent with subsequent requests to authenticated endpoints. Frontend applications typically do not need to manually handle this token, but should ensure `withCredentials` is set to `true` for AJAX requests to include cookies.

### `POST /api/auth/register`

**Description**:
Registers a new user account.

**Authentication**: None (public endpoint)
**Rate Limiting**: Applied to prevent abuse.

**Request**:
- **Method**: `POST`
- **URL**: `/api/auth/register`
- **Content-Type**: `application/json`

**Body Parameters**:
| Parameter  | Type     | Required | Description                                    | Example              |
| :--------- | :------- | :------- | :--------------------------------------------- | :------------------- |
| `name`     | `string` | Yes      | The user's full name. Minimum 2 characters.    | `"John Doe"`         |
| `email`    | `string` | Yes      | The user's email address. Must be a valid email format. | `"john@example.com"` |
| `password` | `string` | Yes      | The user's password. Minimum 8 characters.     | `"securePassword123"` |

**Example Request**:

```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "mySecurePassword123"
}
```

**Success Response (`201 Created`)**:
Sets an `HTTP-only` cookie named `token` containing the JWT.

```json
{
  "message": "User registered successfully",
  "user": {
    "id": "user_id_string_123",
    "email": "jane@example.com",
    "name": "Jane Doe",
    "role": "USER",
    "createdAt": "2023-10-27T10:30:00.000Z"
  }
}
```

**Response Properties**:
| Property    | Type     | Description                                             |
| :---------- | :------- | :------------------------------------------------------ |
| `message`   | `string` | A success message.                                      |
| `user`      | `object` | The newly registered user's public profile data.        |
| `user.id`   | `string` | Unique identifier for the user.                         |
| `user.email` | `string` | The user's email.                                       |
| `user.name` | `string` | The user's name.                                        |
| `user.role` | `string` | The user's role (e.g., "USER").                         |
| `user.createdAt` | `string` | ISO 8601 timestamp of user creation.                    |

**Error Responses**:

-   **`400 Bad Request`**: If validation fails (e.g., invalid email, short password, missing fields) or if a user with the provided email already exists.
    ```json
    {
      "errors": [
        {
          "type": "field",
          "value": "invalid",
          "msg": "Invalid email",
          "path": "email",
          "location": "body"
        }
      ]
    }
    ```
    or
    ```json
    {
      "error": "User already exists with this email"
    }
    ```
-   **`500 Internal Server Error`**: For unexpected server-side issues.
    ```json
    {
      "error": "Internal server error"
    }
    ```

### `POST /api/auth/login`

**Description**:
Authenticates a user and establishes a session.

**Authentication**: None (public endpoint)
**Rate Limiting**: Applied to prevent brute-force attacks.

**Request**:
- **Method**: `POST`
- **URL**: `/api/auth/login`
- **Content-Type**: `application/json`

**Body Parameters**:
| Parameter  | Type     | Required | Description                                    | Example              |
| :--------- | :------- | :------- | :--------------------------------------------- | :------------------- |
| `email`    | `string` | Yes      | The user's email address. Must be a valid email format. | `"john@example.com"` |
| `password` | `string` | Yes      | The user's password.                             | `"securePassword123"` |

**Example Request**:

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "mySecurePassword123"
}
```

**Success Response (`200 OK`)**:
Sets an `HTTP-only` cookie named `token` containing the JWT.

```json
{
  "message": "Login successful",
  "user": {
    "id": "user_id_string_123",
    "email": "john@example.com",
    "name": "John Doe",
    "role": "USER"
  }
}
```

**Response Properties**:
| Property    | Type     | Description                                             |
| :---------- | :------- | :------------------------------------------------------ |
| `message`   | `string` | A success message.                                      |
| `user`      | `object` | The logged-in user's public profile data.               |
| `user.id`   | `string` | Unique identifier for the user.                         |
| `user.email` | `string` | The user's email.                                       |
| `user.name` | `string` | The user's name.                                        |
| `user.role` | `string` | The user's role (e.g., "USER").                         |

**Error Responses**:

-   **`400 Bad Request`**: If validation fails (e.g., invalid email, missing password).
    ```json
    {
      "errors": [
        {
          "type": "field",
          "value": "",
          "msg": "Password is required",
          "path": "password",
          "location": "body"
        }
      ]
    }
    ```
-   **`401 Unauthorized`**: If provided credentials do not match any user.
    ```json
    {
      "error": "Invalid credentials"
    }
    ```
-   **`500 Internal Server Error`**: For unexpected server-side issues.
    ```json
    {
      "error": "Internal server error"
    }
    ```

### `GET /api/auth/profile`

**Description**:
Retrieves the profile information of the currently authenticated user.

**Authentication**: Required (cookie-based)

**Request**:
- **Method**: `GET`
- **URL**: `/api/auth/profile`

**Example Request**:

```http
GET /api/auth/profile
Cookie: token=YOUR_JWT_TOKEN_HERE
```

**Success Response (`200 OK`)**:

```json
{
  "user": {
    "id": "user_id_string_123",
    "email": "john@example.com",
    "name": "John Doe",
    "role": "USER",
    "createdAt": "2023-10-27T10:00:00.000Z",
    "_count": {
      "documents": 5
    }
  }
}
```

**Response Properties**:
| Property          | Type     | Description                                                 |
| :---------------- | :------- | :---------------------------------------------------------- |
| `user`            | `object` | The authenticated user's profile data.                      |
| `user.id`         | `string` | Unique identifier for the user.                             |
| `user.email`      | `string` | The user's email.                                           |
| `user.name`       | `string` | The user's name.                                            |
| `user.role`       | `string` | The user's role (e.g., "USER").                             |
| `user.createdAt`  | `string` | ISO 8601 timestamp of user creation.                        |
| `user._count`     | `object` | Contains counts of related entities.                        |
| `user._count.documents` | `number` | Number of documents uploaded by the user.                   |

**Error Responses**:

-   **`401 Unauthorized`**: If authentication cookie is missing or invalid.
    ```json
    {
      "error": "Authentication required"
    }
    ```
    or
    ```json
    {
      "error": "Invalid session"
    }
    ```
-   **`404 Not Found`**: If the user corresponding to the token is not found (e.g., deleted).
    ```json
    {
      "error": "User not found"
    }
    ```
-   **`500 Internal Server Error`**: For unexpected server-side issues.
    ```json
    {
      "error": "Internal server error"
    }
    ```

### `POST /api/auth/logout`

**Description**:
Logs out the current user by clearing the authentication cookie.

**Authentication**: None (clears cookie, no specific token check on request body)

**Request**:
- **Method**: `POST`
- **URL**: `/api/auth/logout`

**Example Request**:

```http
POST /api/auth/logout
Cookie: token=YOUR_JWT_TOKEN_HERE
```

**Success Response (`200 OK`)**:
Clears the `HTTP-only` cookie named `token`.

```json
{
  "message": "Logout successful"
}
```

**Response Properties**:
| Property  | Type     | Description       |
| :-------- | :------- | :---------------- |
| `message` | `string` | A success message. |

**Error Responses**:

-   **`500 Internal Server Error`**: For unexpected server-side issues (e.g., failure to clear cookie).
    ```json
    {
      "error": "Internal server error"
    }
    ```

---

## 📄 Document Management

Manage the knowledge base for the RAG system, including uploading, listing, searching, and updating documents.

**Authentication**: Required (cookie-based) for all endpoints in this section.

### `POST /api/documents/upload`

**Description**:
Uploads a single document (PDF, Image, Text file) for processing and indexing into the RAG system. The document will be analyzed, summarized, and its embeddings generated.

**Request**:
- **Method**: `POST`
- **URL**: `/api/documents/upload`
- **Content-Type**: `multipart/form-data`

**Body Parameters**:
| Parameter | Type   | Required | Description                                                         | Example                |
| :-------- | :----- | :------- | :------------------------------------------------------------------ | :--------------------- |
| `file`    | `file` | Yes      | The document file to upload (e.g., `application/pdf`, `image/png`). | `[my_report.pdf]`      |

**Example Request**:

```http
POST /api/documents/upload
Content-Type: multipart/form-data

file: [report.pdf]
```

**Success Response (`201 Created`)**:

```json
{
  "message": "Document uploaded and processed successfully",
  "document": {
    "id": "doc_id_string_123",
    "title": "Report from Q3",
    "fileType": "application/pdf",
    "fileSize": 102400,
    "summary": "This report details the Q3 performance...",
    "entities": ["Q3", "performance", "sales"],
    "sentiment": "positive",
    "language": "en",
    "createdAt": "2023-10-27T11:00:00.000Z"
  }
}
```

**Response Properties**:
| Property       | Type     | Description                                               |
| :------------- | :------- | :-------------------------------------------------------- |
| `message`      | `string` | A success message.                                        |
| `document`     | `object` | The details of the newly uploaded and processed document. |
| `document.id`  | `string` | Unique identifier for the document.                       |
| `document.title` | `string` | The extracted title of the document.                      |
| `document.fileType` | `string` | The MIME type of the uploaded file.                       |
| `document.fileSize` | `number` | Size of the file in bytes.                                |
| `document.summary` | `string` | An AI-generated summary of the document content.          |
| `document.entities` | `string[]` | Key entities extracted from the document.                 |
| `document.sentiment` | `string` | Sentiment analysis of the document (e.g., "positive", "neutral", "negative"). |
| `document.language` | `string` | Detected language of the document (e.g., "en").           |
| `document.createdAt` | `string` | ISO 8601 timestamp of document creation.                  |

**Error Responses**:

-   **`400 Bad Request`**: If no file is provided in the request.
    ```json
    {
      "error": "No file uploaded"
    }
    ```
-   **`401 Unauthorized`**: If authentication cookie is missing or invalid.
-   **`500 Internal Server Error`**: For unexpected server-side issues during processing.
    ```json
    {
      "error": "Failed to process document"
    }
    ```

### `POST /api/documents/batch-upload`

**Description**:
Uploads multiple documents for processing and indexing into the RAG system. Each document will be processed individually.

**Request**:
- **Method**: `POST`
- **URL**: `/api/documents/batch-upload`
- **Content-Type**: `multipart/form-data`

**Body Parameters**:
| Parameter | Type     | Required | Description                                                         | Example                               |
| :-------- | :------- | :------- | :------------------------------------------------------------------ | :------------------------------------ |
| `files`   | `file[]` | Yes      | An array of document files to upload (e.g., `application/pdf`).     | `[report1.pdf, report2.pdf]`          |

**Example Request**:

```http
POST /api/documents/batch-upload
Content-Type: multipart/form-data

files: [document1.pdf, image2.png]
```

**Success Response (`201 Created`)**:

```json
{
  "message": "Batch upload completed: 1 successful, 1 failed",
  "results": [
    {
      "filename": "document1.pdf",
      "document": {
        "id": "doc_id_string_123",
        "title": "Document One",
        "fileType": "application/pdf",
        "fileSize": 50000,
        "summary": "Summary of document one.",
        "createdAt": "2023-10-27T11:05:00.000Z"
      },
      "status": "success"
    }
  ],
  "errors": [
    {
      "filename": "image2.png",
      "error": "Processing failed",
      "status": "error"
    }
  ]
}
```

**Response Properties**:
| Property    | Type        | Description                                                       |
| :---------- | :---------- | :---------------------------------------------------------------- |
| `message`   | `string`    | A summary message for the batch upload.                           |
| `results`   | `object[]`  | Array of successfully processed documents with their filenames.   |
| `results[].filename` | `string` | The original filename.                                            |
| `results[].document` | `object` | Details of the processed document (similar to single upload response, but potentially fewer fields). |
| `results[].status` | `string` | "success" indicating successful processing.                       |
| `errors`    | `object[]`  | Array of files that failed processing.                            |
| `errors[].filename` | `string` | The original filename of the failed file.                         |
| `errors[].error` | `string` | A brief description of the error.                                 |
| `errors[].status` | `string` | "error" indicating processing failure.                            |

**Error Responses**:

-   **`400 Bad Request`**: If no files are provided in the request or if `req.files` is not an array.
    ```json
    {
      "error": "No files uploaded"
    }
    ```
-   **`401 Unauthorized`**: If authentication cookie is missing or invalid.
-   **`500 Internal Server Error`**: For unexpected server-side issues during batch processing.
    ```json
    {
      "error": "Failed to process batch upload"
    }
    ```

### `GET /api/documents`

**Description**:
Retrieves a paginated list of documents uploaded by the authenticated user. Supports filtering and sorting.

**Request**:
- **Method**: `GET`
- **URL**: `/api/documents`

**Query Parameters**:
| Parameter  | Type     | Required | Description                                                         | Example           |
| :--------- | :------- | :------- | :------------------------------------------------------------------ | :---------------- |
| `page`     | `number` | No       | The page number for pagination. Default: `1`. Minimum: `1`.         | `?page=2`         |
| `limit`    | `number` | No       | The number of documents per page. Default: `10`. Minimum: `1`, Maximum: `100`. | `?limit=20`       |
| `search`   | `string` | No       | Text to search within document titles or content (case-insensitive). | `?search=quarterly report` |
| `fileType` | `string` | No       | Filter documents by MIME type (e.g., `application/pdf`, `image/png`). | `?fileType=pdf`   |
| `sortBy`   | `string` | No       | Field to sort the documents by. Accepts: `createdAt`, `title`, `fileSize`. Default: `createdAt`. | `?sortBy=title`   |
| `sortOrder`| `string` | No       | Order of sorting. Accepts: `asc` (ascending), `desc` (descending). Default: `desc`. | `?sortOrder=asc`  |

**Example Request**:

```http
GET /api/documents?page=1&limit=5&search=project&sortBy=createdAt&sortOrder=desc
```

**Success Response (`200 OK`)**:

```json
{
  "documents": [
    {
      "id": "doc_id_string_456",
      "title": "Project Alpha Brief",
      "fileType": "application/pdf",
      "fileSize": 75000,
      "summary": "Overview of Project Alpha goals and milestones.",
      "entities": ["Project Alpha", "goals", "milestones"],
      "sentiment": "neutral",
      "language": "en",
      "createdAt": "2023-10-27T11:10:00.000Z",
      "updatedAt": "2023-10-27T11:10:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 5,
    "total": 12,
    "pages": 3
  }
}
```

**Response Properties**:
| Property       | Type     | Description                                                     |
| :------------- | :------- | :-------------------------------------------------------------- |
| `documents`    | `object[]` | An array of document objects. Each object contains metadata and summary. |
| `documents[].id` | `string` | Unique identifier for the document.                             |
| `documents[].title` | `string` | The extracted title of the document.                            |
| `documents[].fileType` | `string` | The MIME type of the uploaded file.                             |
| `documents[].fileSize` | `number` | Size of the file in bytes.                                      |
| `documents[].summary` | `string` | An AI-generated summary of the document content.                |
| `documents[].entities` | `string[]` | Key entities extracted from the document.                       |
| `documents[].sentiment` | `string` | Sentiment analysis of the document.                             |
| `documents[].language` | `string` | Detected language of the document.                              |
| `documents[].createdAt` | `string` | ISO 8601 timestamp of document creation.                        |
| `documents[].updatedAt` | `string` | ISO 8601 timestamp of last update.                              |
| `pagination`   | `object` | Pagination details.                                             |
| `pagination.page` | `number` | Current page number.                                            |
| `pagination.limit` | `number` | Number of items per page.                                       |
| `pagination.total` | `number` | Total number of documents matching the query.                   |
| `pagination.pages` | `number` | Total number of pages.                                          |

**Error Responses**:

-   **`400 Bad Request`**: If query parameters fail validation (e.g., `limit` outside range).
-   **`401 Unauthorized`**: If authentication cookie is missing or invalid.
-   **`500 Internal Server Error`**: For unexpected server-side issues.

### `GET /api/documents/vector-search`

**Description**:
Performs a semantic search on documents using vector embeddings. This allows finding documents conceptually similar to the query, even if exact keywords are not present. Results are filtered to the authenticated user's documents.

**Request**:
- **Method**: `GET`
- **URL**: `/api/documents/vector-search`

**Query Parameters**:
| Parameter      | Type     | Required | Description                                                         | Example                  |
| :------------- | :------- | :------- | :------------------------------------------------------------------ | :----------------------- |
| `query`        | `string` | Yes      | The semantic search query or question.                              | `?query=latest financial regulations` |
| `limit`        | `number` | No       | Maximum number of search results to return. Default: `10`. Minimum: `1`, Maximum: `50`. | `?limit=5`               |
| `numCandidates`| `number` | No       | Number of nearest neighbors to retrieve from the vector store before filtering. Default: `max(limit * 2, 50)`. Minimum: `10`, Maximum: `200`. | `?numCandidates=100`     |
| `similarity`   | `string` | No       | The similarity metric to use for vector comparison. Accepts: `cosine`, `euclidean`, `dotProduct`. Default: `cosine`. | `?similarity=euclidean`  |

**Example Request**:

```http
GET /api/documents/vector-search?query=future of AI in healthcare&limit=3
```

**Success Response (`200 OK`)**:

```json
{
  "query": "future of AI in healthcare",
  "results": [
    {
      "id": "doc_id_string_789",
      "title": "AI Innovations in Medical Diagnostics",
      "content": "Artificial intelligence is revolutionizing medical diagnostics...",
      "score": 0.92,
      "metadata": {
        "fileType": "application/pdf",
        "fileSize": 80000,
        "createdAt": "2023-09-15T09:00:00.000Z",
        "updatedAt": "2023-09-15T09:00:00.000Z",
        "userId": "user_id_string_123"
      }
    }
  ],
  "total": 1,
  "searchType": "vector"
}
```

**Response Properties**:
| Property       | Type     | Description                                                         |
| :------------- | :------- | :------------------------------------------------------------------ |
| `query`        | `string` | The original search query.                                          |
| `results`      | `object[]` | An array of search result objects, ordered by similarity score.       |
| `results[].id` | `string` | Unique identifier for the document.                                 |
| `results[].title` | `string` | The title of the document.                                          |
| `results[].content` | `string` | A snippet or the full content of the relevant part of the document. |
| `results[].score` | `number` | The similarity score between the query and the document (higher is more similar). |
| `results[].metadata` | `object` | Additional metadata about the document.                             |
| `total`        | `number` | The total number of results found.                                  |
| `searchType`   | `string` | Indicates the type of search performed (`"vector"`).                  |

**Error Responses**:

-   **`400 Bad Request`**: If the `query` parameter is missing or validation fails.
-   **`401 Unauthorized`**: If authentication cookie is missing or invalid.
-   **`500 Internal Server Error`**: For unexpected server-side issues during vector search.
    ```json
    {
      "error": "Vector search failed",
      "details": "Error message"
    }
    ```

### `GET /api/documents/hybrid-search`

**Description**:
Performs a hybrid search combining both semantic (vector) search and traditional keyword-based text search. This approach aims to provide more relevant results by leveraging the strengths of both methods. Results are filtered to the authenticated user's documents.

**Request**:
- **Method**: `GET`
- **URL**: `/api/documents/hybrid-search`

**Query Parameters**:
| Parameter      | Type     | Required | Description                                                         | Example                  |
| :------------- | :------- | :------- | :------------------------------------------------------------------ | :----------------------- |
| `query`        | `string` | Yes      | The search query.                                                   | `?query=project proposal deadlines` |
| `limit`        | `number` | No       | Maximum number of search results to return. Default: `10`. Minimum: `1`, Maximum: `50`. | `?limit=5`               |
| `numCandidates`| `number` | No       | Number of nearest neighbors to retrieve from the vector store. Default: `max(limit * 2, 50)`. Minimum: `10`, Maximum: `200`. | `?numCandidates=100`     |
| `textWeight`   | `number` | No       | Weight assigned to the text search component (0 to 1). Default: `0.3`. | `?textWeight=0.5`        |
| `vectorWeight` | `number` | No       | Weight assigned to the vector search component (0 to 1). Default: `0.7`. | `?vectorWeight=0.5`      |

**Example Request**:

```http
GET /api/documents/hybrid-search?query=latest marketing strategy&limit=5&textWeight=0.4&vectorWeight=0.6
```

**Success Response (`200 OK`)**:

```json
{
  "query": "latest marketing strategy",
  "results": [
    {
      "id": "doc_id_string_abc",
      "title": "Q4 Marketing Strategy Document",
      "content": "This document outlines the marketing strategy for Q4...",
      "score": 0.88,
      "metadata": {
        "fileType": "application/pdf",
        "fileSize": 120000,
        "createdAt": "2023-10-01T08:00:00.000Z",
        "updatedAt": "2023-10-01T08:00:00.000Z",
        "userId": "user_id_string_123"
      }
    }
  ],
  "total": 1,
  "searchType": "hybrid",
  "weights": {
    "textWeight": 0.4,
    "vectorWeight": 0.6
  }
}
```

**Response Properties**:
| Property         | Type     | Description                                                         |
| :--------------- | :------- | :------------------------------------------------------------------ |
| `query`          | `string` | The original search query.                                          |
| `results`        | `object[]` | An array of search result objects, ordered by combined score.         |
| `results[].id`   | `string` | Unique identifier for the document.                                 |
| `results[].title` | `string` | The title of the document.                                          |
| `results[].content` | `string` | A snippet or the full content of the relevant part of the document. |
| `results[].score` | `number` | The combined relevance score (higher is more relevant).             |
| `results[].metadata` | `object` | Additional metadata about the document.                             |
| `total`          | `number` | The total number of results found.                                  |
| `searchType`     | `string` | Indicates the type of search performed (`"hybrid"`).                  |
| `weights`        | `object` | The weights applied to text and vector components.                  |
| `weights.textWeight` | `number` | Weight for text search.                                             |
| `weights.vectorWeight` | `number` | Weight for vector search.                                           |

**Error Responses**:

-   **`400 Bad Request`**: If the `query` parameter is missing or validation fails.
-   **`401 Unauthorized`**: If authentication cookie is missing or invalid.
-   **`500 Internal Server Error`**: For unexpected server-side issues during hybrid search.

### `GET /api/documents/enhanced-search`

**Description**:
Provides an enhanced search capability that intelligently combines traditional text search and vector search based on configuration. This endpoint offers flexibility to prioritize one method over the other or use a blended approach. Results are filtered to the authenticated user's documents.

**Request**:
- **Method**: `GET`
- **URL**: `/api/documents/enhanced-search`

**Query Parameters**:
| Parameter      | Type      | Required | Description                                                         | Example                  |
| :------------- | :-------- | :------- | :------------------------------------------------------------------ | :----------------------- |
| `query`        | `string`  | Yes      | The search query.                                                   | `?query=new product features` |
| `page`         | `number`  | No       | The page number for pagination when using traditional search. Default: `1`. Minimum: `1`. | `?page=1`                |
| `limit`        | `number`  | No       | Maximum number of search results to return. Default: `10`. Minimum: `1`, Maximum: `50`. | `?limit=10`              |
| `fileType`     | `string`  | No       | Filter documents by MIME type.                                      | `?fileType=pdf`          |
| `useVector`    | `boolean` | No       | If `true`, uses a vector-enhanced approach (hybrid search). If `false` or omitted, uses traditional text search. Default: `false`. | `?useVector=true`        |
| `vectorWeight` | `number`  | No       | Weight assigned to the vector search component when `useVector` is `true`. Default: `0.7`. (0 to 1). | `?vectorWeight=0.8`      |

**Example Request (Vector-enhanced)**:

```http
GET /api/documents/enhanced-search?query=quarterly financial review&useVector=true&vectorWeight=0.7
```

**Example Request (Traditional)**:

```http
GET /api/documents/enhanced-search?query=meeting minutes&fileType=text/plain&page=2
```

**Success Response (`200 OK`)**:

-   **When `useVector=true` (Vector-enhanced/Hybrid Search)**:
    ```json
    {
      "query": "quarterly financial review",
      "results": [
        {
          "id": "doc_id_string_def",
          "title": "Q1 2023 Financial Review",
          "content": "Highlights from the first quarter financial performance...",
          "score": 0.91,
          "metadata": { /* ... */ }
        }
      ],
      "total": 1,
      "page": 1,
      "limit": 10,
      "searchType": "enhanced_vector",
      "vectorWeight": 0.7
    }
    ```
-   **When `useVector=false` (Traditional Search)**:
    ```json
    {
      "query": "meeting minutes",
      "results": [
        {
          "id": "doc_id_string_ghi",
          "title": "Team Meeting Minutes 2023-10-25",
          "content": "Attendees: John, Jane. Discussion points: Project timeline, budget...",
          "score": 1.0,
          "metadata": {
            "fileType": "text/plain",
            "fileSize": 5000,
            "createdAt": "2023-10-25T14:00:00.000Z",
            "updatedAt": "2023-10-25T14:00:00.000Z"
          }
        }
      ],
      "total": 20,
      "page": 1,
      "limit": 10,
      "totalPages": 2,
      "searchType": "traditional"
    }
    ```

**Response Properties**:
(Varies slightly based on `searchType`. See `vector-search` and `get-documents` responses for details on `results` and `pagination` objects.)

**Error Responses**:

-   **`400 Bad Request`**: If the `query` parameter is missing or validation fails.
-   **`401 Unauthorized`**: If authentication cookie is missing or invalid.
-   **`500 Internal Server Error`**: For unexpected server-side issues.

### `GET /api/documents/search-stats`

**Description**:
Retrieves statistics related to the document search capabilities, including the number of indexed vectors and document types. Provides insight into the current state of the vector search index.

**Request**:
- **Method**: `GET`
- **URL**: `/api/documents/search-stats`

**Example Request**:

```http
GET /api/documents/search-stats
```

**Success Response (`200 OK`)**:

```json
{
  "totalVectorsIndexed": 1500,
  "uniqueDocumentTypes": ["application/pdf", "image/jpeg", "text/plain"],
  "averageEmbeddingDimension": 768,
  "userDocuments": 75,
  "vectorSearchAvailable": true
}
```

**Response Properties**:
| Property                  | Type      | Description                                                                 |
| :------------------------ | :-------- | :-------------------------------------------------------------------------- |
| `totalVectorsIndexed`     | `number`  | The total count of vectors indexed across all users.                        |
| `uniqueDocumentTypes`     | `string[]` | An array of unique MIME types of documents present in the index.            |
| `averageEmbeddingDimension` | `number`  | The dimension size of the generated vector embeddings.                      |
| `userDocuments`           | `number`  | The number of documents owned by the authenticated user.                    |
| `vectorSearchAvailable`   | `boolean` | Indicates if the vector search service is operational.                      |

**Error Responses**:

-   **`401 Unauthorized`**: If authentication cookie is missing or invalid.
-   **`500 Internal Server Error`**: For unexpected server-side issues.

### `GET /api/documents/:id/similar`

**Description**:
Finds documents semantically similar to a specified reference document (identified by `id`). This is useful for content recommendation or discovering related information. Results are filtered to the authenticated user's documents.

**Request**:
- **Method**: `GET`
- **URL**: `/api/documents/{document_id}/similar`

**Path Parameters**:
| Parameter | Type     | Required | Description                        | Example                    |
| :-------- | :------- | :------- | :--------------------------------- | :------------------------- |
| `id`      | `string` | Yes      | The unique ID of the reference document. | `doc_id_string_ref`      |

**Query Parameters**:
| Parameter      | Type     | Required | Description                                                         | Example           |
| :------------- | :------- | :------- | :------------------------------------------------------------------ | :---------------- |
| `limit`        | `number` | No       | Maximum number of similar documents to return. Default: `5`. Minimum: `1`, Maximum: `20`. | `?limit=3`        |
| `numCandidates`| `number` | No       | Number of nearest neighbors to retrieve from the vector store before filtering. Default: `max(limit * 2, 20)`. Minimum: `10`, Maximum: `100`. | `?numCandidates=50` |

**Example Request**:

```http
GET /api/documents/doc_id_string_ref/similar?limit=3
```

**Success Response (`200 OK`)**:

```json
{
  "documentId": "doc_id_string_ref",
  "results": [
    {
      "id": "similar_doc_id_string_1",
      "title": "Related Research Paper A",
      "content": "This paper discusses topics highly relevant to the reference document...",
      "score": 0.95,
      "metadata": { /* ... */ }
    },
    {
      "id": "similar_doc_id_string_2",
      "title": "Industry Trends Analysis",
      "content": "Analysis of trends impacting the area covered by the reference document...",
      "score": 0.88,
      "metadata": { /* ... */ }
    }
  ],
  "total": 2,
  "searchType": "similar"
}
```

**Response Properties**:
| Property       | Type     | Description                                                         |
| :------------- | :------- | :------------------------------------------------------------------ |
| `documentId`   | `string` | The ID of the reference document.                                   |
| `results`      | `object[]` | An array of similar document objects, ordered by similarity score.    |
| `results[].id` | `string` | Unique identifier for the similar document.                         |
| `results[].title` | `string` | The title of the similar document.                                  |
| `results[].content` | `string` | A snippet or the full content of the similar document.              |
| `results[].score` | `number` | The similarity score (higher is more similar).                      |
| `results[].metadata` | `object` | Additional metadata about the similar document.                     |
| `total`        | `number` | The total number of similar results found for the user.             |
| `searchType`   | `string` | Indicates the type of search performed (`"similar"`).                 |

**Error Responses**:

-   **`400 Bad Request`**: If query parameters fail validation.
-   **`401 Unauthorized`**: If authentication cookie is missing or invalid.
-   **`404 Not Found`**: If the reference document (`:id`) does not exist or does not belong to the authenticated user.
-   **`500 Internal Server Error`**: For unexpected server-side issues.

### `GET /api/documents/:id`

**Description**:
Retrieves the full details of a specific document by its ID, ensuring it belongs to the authenticated user.

**Request**:
- **Method**: `GET`
- **URL**: `/api/documents/{document_id}`

**Path Parameters**:
| Parameter | Type     | Required | Description                        | Example                    |
| :-------- | :------- | :------- | :--------------------------------- | :------------------------- |
| `id`      | `string` | Yes      | The unique ID of the document to retrieve. | `doc_id_string_123`      |

**Example Request**:

```http
GET /api/documents/doc_id_string_123
```

**Success Response (`200 OK`)**:

```json
{
  "document": {
    "id": "doc_id_string_123",
    "title": "Detailed Project Plan",
    "content": "This document outlines the complete project plan for the upcoming quarter...",
    "fileType": "application/pdf",
    "fileSize": 250000,
    "summary": "Comprehensive plan for Q4 project initiatives.",
    "entities": ["project plan", "Q4", "initiatives", "budget"],
    "sentiment": "positive",
    "language": "en",
    "createdAt": "2023-10-20T09:00:00.000Z",
    "updatedAt": "2023-10-20T10:30:00.000Z",
    "metadata": { "author": "Jane Doe", "department": "R&D" },
    "base64Content": "JVBERi0xLjQNCiX..." // Base64 encoded content of the original file
  }
}
```

**Response Properties**:
| Property       | Type     | Description                                                     |
| :------------- | :------- | :-------------------------------------------------------------- |
| `document`     | `object` | The full document object.                                       |
| `document.id`  | `string` | Unique identifier for the document.                             |
| `document.title` | `string` | The extracted title.                                            |
| `document.content` | `string` | The extracted text content of the document.                     |
| `document.fileType` | `string` | The MIME type.                                                  |
| `document.fileSize` | `number` | Size in bytes.                                                  |
| `document.summary` | `string` | AI-generated summary.                                           |
| `document.entities` | `string[]` | Extracted key entities.                                         |
| `document.sentiment` | `string` | Sentiment analysis.                                             |
| `document.language` | `string` | Detected language.                                              |
| `document.createdAt` | `string` | ISO 8601 timestamp of creation.                                 |
| `document.updatedAt` | `string` | ISO 8601 timestamp of last update.                              |
| `document.metadata` | `object` | Original metadata from the file.                                |
| `document.base64Content` | `string` | The original file content encoded in Base64 (may be large).     |

**Error Responses**:

-   **`401 Unauthorized`**: If authentication cookie is missing or invalid.
-   **`404 Not Found`**: If the document does not exist or does not belong to the authenticated user.
-   **`500 Internal Server Error`**: For unexpected server-side issues.

### `PATCH /api/documents/:id`

**Description**:
Updates specific metadata fields (e.g., `title`, `summary`) for a document identified by its ID. Only fields provided in the request body will be updated. The document must belong to the authenticated user.

**Request**:
- **Method**: `PATCH`
- **URL**: `/api/documents/{document_id}`
- **Content-Type**: `application/json`

**Path Parameters**:
| Parameter | Type     | Required | Description                        | Example                    |
| :-------- | :------- | :------- | :--------------------------------- | :------------------------- |
| `id`      | `string` | Yes      | The unique ID of the document to update. | `doc_id_string_123`      |

**Body Parameters**:
| Parameter | Type     | Required | Description                                                         | Example                   |
| :-------- | :------- | :------- | :------------------------------------------------------------------ | :------------------------ |
| `title`   | `string` | No       | The new title for the document.                                     | `"Revised Project Proposal"` |
| `summary` | `string` | No       | A new summary for the document.                                     | `"Updated summary of changes."` |

**Example Request**:

```http
PATCH /api/documents/doc_id_string_123
Content-Type: application/json

{
  "title": "Revised Project Proposal 2024",
  "summary": "This is an updated summary reflecting recent changes."
}
```

**Success Response (`200 OK`)**:

```json
{
  "message": "Document updated successfully",
  "document": {
    "id": "doc_id_string_123",
    "title": "Revised Project Proposal 2024",
    "summary": "This is an updated summary reflecting recent changes.",
    "updatedAt": "2023-10-27T12:30:00.000Z"
  }
}
```

**Response Properties**:
| Property       | Type     | Description                                                     |
| :------------- | :------- | :-------------------------------------------------------------- |
| `message`      | `string` | A success message.                                              |
| `document`     | `object` | The updated document object, containing only the modified fields. |
| `document.id`  | `string` | Unique identifier for the document.                             |
| `document.title` | `string` | The updated title.                                              |
| `document.summary` | `string` | The updated summary.                                            |
| `document.updatedAt` | `string` | ISO 8601 timestamp of the update.                               |

**Error Responses**:

-   **`400 Bad Request`**: If body parameters fail validation.
-   **`401 Unauthorized`**: If authentication cookie is missing or invalid.
-   **`404 Not Found`**: If the document does not exist or does not belong to the authenticated user.
-   **`500 Internal Server Error`**: For unexpected server-side issues.

### `DELETE /api/documents/:id`

**Description**:
Deletes a document identified by its ID. The document must belong to the authenticated user. This action is irreversible.

**Request**:
- **Method**: `DELETE`
- **URL**: `/api/documents/{document_id}`

**Path Parameters**:
| Parameter | Type     | Required | Description                        | Example                    |
| :-------- | :------- | :------- | :--------------------------------- | :------------------------- |
| `id`      | `string` | Yes      | The unique ID of the document to delete. | `doc_id_string_123`      |

**Example Request**:

```http
DELETE /api/documents/doc_id_string_123
```

**Success Response (`200 OK`)**:

```json
{
  "message": "Document deleted successfully"
}
```

**Response Properties**:
| Property  | Type     | Description       |
| :-------- | :------- | :---------------- |
| `message` | `string` | A success message. |

**Error Responses**:

-   **`401 Unauthorized`**: If authentication cookie is missing or invalid.
-   **`404 Not Found`**: If the document does not exist or does not belong to the authenticated user.
-   **`500 Internal Server Error`**: For unexpected server-side issues.

---

## ❤️ Health Check

These endpoints provide information about the application's operational status. They are typically used for monitoring and by container orchestration systems (like Kubernetes) for liveness and readiness probes.

### `GET /health`

**Description**:
Performs a general health check of the application and its core services.

**Authentication**: None

**Request**:
- **Method**: `GET`
- **URL**: `/health`

**Example Request**:

```http
GET /health
```

**Success Response (`200 OK`)**:

```json
{
  "message": "Health check successful",
  "data": {
    "status": "healthy",
    "timestamp": "2023-10-27T13:00:00.000Z",
    "version": "1.0.0",
    "environment": "development",
    "uptime": 3600.5,
    "memory": {
      "rss": 50000000,
      "heapTotal": 30000000,
      "heapUsed": 20000000,
      "external": 5000000
    }
  }
}
```

**Response Properties**:
| Property          | Type     | Description                                                     |
| :---------------- | :------- | :-------------------------------------------------------------- |
| `message`         | `string` | A success message.                                              |
| `data`            | `object` | Health details.                                                 |
| `data.status`     | `string` | Overall health status ("healthy").                              |
| `data.timestamp`  | `string` | ISO 8601 timestamp of when the check was performed.             |
| `data.version`    | `string` | Application version.                                            |
| `data.environment` | `string` | Application environment (e.g., "development", "production").    |
| `data.uptime`     | `number` | Server uptime in seconds.                                       |
| `data.memory`     | `object` | Detailed memory usage statistics.                               |

**Error Responses**:

-   **`500 Internal Server Error`**: If any critical service is down or an unexpected error occurs during the health check.
    ```json
    {
      "message": "Health check failed",
      "data": {
        "status": "unhealthy",
        "error": "Database connection failed"
      }
    }
    ```

### `GET /ready`

**Description**:
Readiness probe endpoint. Indicates if the application is ready to handle requests. This usually means all necessary dependencies (e.g., database, external services) are connected and operational.

**Authentication**: None

**Request**:
- **Method**: `GET`
- **URL**: `/ready`

**Example Request**:

```http
GET /ready
```

**Success Response (`200 OK`)**:

```json
{
  "message": "Application is ready",
  "data": {
    "status": "ready",
    "timestamp": "2023-10-27T13:05:00.000Z"
  }
}
```

**Response Properties**:
| Property          | Type     | Description                                             |
| :---------------- | :------- | :------------------------------------------------------ |
| `message`         | `string` | A success message.                                      |
| `data`            | `object` | Readiness details.                                      |
| `data.status`     | `string` | Application readiness status ("ready").                 |
| `data.timestamp`  | `string` | ISO 8601 timestamp of when the check was performed.     |

**Error Response (`503 Service Unavailable`)**: If the application is not yet ready (e.g., still connecting to database).
```json
{
  "message": "Application is not ready",
  "data": {
    "status": "not_ready",
    "timestamp": "2023-10-27T13:05:00.000Z"
  }
}
```

### `GET /live`

**Description**:
Liveness probe endpoint. Indicates if the application is running and responsive. A failure here might trigger a restart of the application container.

**Authentication**: None

**Request**:
- **Method**: `GET`
- **URL**: `/live`

**Example Request**:

```http
GET /live
```

**Success Response (`200 OK`)**:

```json
{
  "message": "Application is alive",
  "data": {
    "status": "alive",
    "timestamp": "2023-10-27T13:10:00.000Z",
    "uptime": 3660.1
  }
}
```

**Response Properties**:
| Property          | Type     | Description                                             |
| :---------------- | :------- | :------------------------------------------------------ |
| `message`         | `string` | A success message.                                      |
| `data`            | `object` | Liveness details.                                       |
| `data.status`     | `string` | Application liveness status ("alive").                  |
| `data.timestamp`  | `string` | ISO 8601 timestamp of when the check was performed.     |
| `data.uptime`     | `number` | Server uptime in seconds.                               |

**Error Responses**:

-   A non-200 status code indicates a failure. No specific error body is defined beyond the standard HTTP error.

### `GET /metrics`

**Description**:
Provides various system and application metrics.

**Authentication**: None

**Request**:
- **Method**: `GET`
- **URL**: `/metrics`

**Example Request**:

```http
GET /metrics
```

**Success Response (`200 OK`)**:

```json
{
  "message": "System metrics retrieved",
  "data": {
    "timestamp": "2023-10-27T13:15:00.000Z",
    "uptime": 3720.0,
    "memory": {
      "rss": 55000000,
      "heapTotal": 32000000,
      "heapUsed": 22000000,
      "external": 6000000
    },
    "cpu": {
      "user": 10000,
      "system": 5000
    },
    "platform": "linux",
    "nodeVersion": "v18.17.1"
  }
}
```

**Response Properties**:
| Property          | Type     | Description                                             |
| :---------------- | :------- | :------------------------------------------------------ |
| `message`         | `string` | A success message.                                      |
| `data`            | `object` | Metrics details.                                        |
| `data.timestamp`  | `string` | ISO 8601 timestamp of when metrics were collected.      |
| `data.uptime`     | `number` | Server uptime in seconds.                               |
| `data.memory`     | `object` | Detailed memory usage statistics.                       |
| `data.cpu`        | `object` | CPU usage statistics.                                   |
| `data.platform`   | `string` | Operating system platform.                              |
| `data.nodeVersion` | `string` | Node.js runtime version.                                |

**Error Responses**:

-   **`500 Internal Server Error`**: For unexpected server-side issues while retrieving metrics.