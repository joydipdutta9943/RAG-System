# Phase 1 Features - Enhanced RAG System

## Overview

Phase 1 introduces powerful AI-driven features leveraging Google's free AI services (Gemini Vision, Gemini Flash models) to dramatically enhance document processing, analysis, and understanding capabilities.

## 🚀 New Features

### 1. Enhanced Multimodal AI (Gemini Vision)

**Endpoint Prefix:** `/api/vision`

Gemini Vision provides advanced image understanding capabilities beyond traditional OCR.

#### Features:
- **Image Analysis** - Comprehensive image understanding with object detection
- **Chart/Graph Data Extraction** - Extract structured data from charts
- **Diagram Analysis** - Understand flowcharts, mind maps, and technical diagrams
- **Visual Question Answering** - Ask questions about images
- **Image Comparison** - Compare two images side-by-side

#### API Endpoints:

```bash
# Analyze image with AI
POST /api/vision/analyze
Content-Type: multipart/form-data
Authorization: Bearer <token>

# Request
file: <image file>

# Response
{
  "success": true,
  "analysis": {
    "description": "A bar chart showing sales data...",
    "detectedObjects": ["chart", "bars", "axis"],
    "hasText": true,
    "hasChart": true,
    "hasDiagram": false,
    "imageCategory": "chart",
    "confidence": 95
  }
}
```

```bash
# Extract chart data
POST /api/vision/extract-chart
Content-Type: multipart/form-data
Authorization: Bearer <token>

# Response
{
  "success": true,
  "chartData": {
    "chartType": "bar",
    "title": "Q1 2024 Sales",
    "data": {"Jan": 100, "Feb": 150, "Mar": 200},
    "labels": ["Jan", "Feb", "Mar"],
    "values": [100, 150, 200],
    "interpretation": "Sales increased steadily through Q1"
  }
}
```

```bash
# Analyze diagram/flowchart
POST /api/vision/analyze-diagram
Content-Type: multipart/form-data
Authorization: Bearer <token>

# Response
{
  "success": true,
  "diagramAnalysis": {
    "diagramType": "flowchart",
    "components": ["Start", "Process", "Decision", "End"],
    "relationships": ["Start leads to Process", "Process connects to Decision"],
    "mainConcepts": ["User registration flow", "Validation steps"],
    "explanation": "This flowchart depicts a user registration process..."
  }
}
```

```bash
# Visual question answering
POST /api/vision/ask
Content-Type: multipart/form-data
Authorization: Bearer <token>

# Request
file: <image file>
question: "What is the trend shown in this chart?"

# Response
{
  "success": true,
  "question": "What is the trend shown in this chart?",
  "answer": "The chart shows an upward trend in sales from Q1 to Q4...",
  "confidence": 85,
  "sources": ["gemini-vision"]
}
```

```bash
# Compare two images
POST /api/vision/compare
Content-Type: multipart/form-data
Authorization: Bearer <token>

# Request
files: [<image1>, <image2>]

# Response
{
  "success": true,
  "comparison": "Both images show bar charts. Image 1 displays Q1 data while Image 2 shows Q2 data. The main difference is..."
}
```

---

### 2. Smart Document Categorization

**Endpoint Prefix:** `/api/ai/documents/:documentId`

AI-powered document analysis providing automatic categorization, entity extraction, and quality assessment.

#### Features:
- **Auto-Categorization** - Classify documents into types (Invoice, Resume, Report, etc.)
- **Entity Extraction** - Extract people, organizations, locations, dates, emails, URLs
- **Key Points Extraction** - Identify main takeaways
- **Quality Assessment** - Score document quality and readability

#### API Endpoints:

```bash
# Categorize document
POST /api/ai/documents/:documentId/categorize
Authorization: Bearer <token>

# Response
{
  "success": true,
  "documentId": "abc123",
  "category": "Invoice",
  "categories": ["Invoice", "Financial Document", "Business Document"],
  "confidence": 92
}
```

```bash
# Extract entities
POST /api/ai/documents/:documentId/extract-entities
Authorization: Bearer <token>

# Response
{
  "success": true,
  "documentId": "abc123",
  "entities": {
    "people": ["John Doe", "Jane Smith"],
    "organizations": ["Acme Corp", "TechStart Inc"],
    "locations": ["New York", "San Francisco"],
    "dates": ["2024-01-15", "March 2024"],
    "emails": ["john@example.com"],
    "phoneNumbers": ["+1-555-1234"],
    "urls": ["https://example.com"]
  }
}
```

```bash
# Extract key points
POST /api/ai/documents/:documentId/key-points?maxPoints=10
Authorization: Bearer <token>

# Response
{
  "success": true,
  "documentId": "abc123",
  "keyPoints": [
    "Revenue increased by 25% year-over-year",
    "Three new products launched in Q2",
    "Customer satisfaction rating improved to 4.5/5"
  ],
  "mainTopics": ["Revenue Growth", "Product Launch", "Customer Satisfaction"],
  "actionItems": ["Review Q3 targets", "Prepare marketing materials"]
}
```

```bash
# Assess document quality
POST /api/ai/documents/:documentId/assess-quality
Authorization: Bearer <token>

# Response
{
  "success": true,
  "documentId": "abc123",
  "qualityScore": 85,
  "readabilityScore": 72,
  "qualityLevel": "Excellent",
  "readabilityLevel": "Easy"
}
```

---

### 3. Enhanced Summarization Suite

**Endpoint Prefix:** `/api/ai/documents/:documentId`

Multiple levels of AI-generated summaries and content transformation tools.

#### Features:
- **Multi-Level Summaries** - One-sentence, paragraph, executive, chapter-by-chapter
- **Content Rewriting** - Rewrite in different tones (formal, casual, technical, simple)
- **Title Generation** - AI-generated title suggestions
- **Report Generation** - Combine multiple documents into one report
- **Action Items Extraction** - Pull out tasks and to-dos
- **Q&A Pair Generation** - Create training datasets

#### API Endpoints:

```bash
# Generate summaries (all levels)
POST /api/ai/documents/:documentId/summarize?level=all
Authorization: Bearer <token>

# Response
{
  "success": true,
  "documentId": "abc123",
  "summaries": {
    "oneSentence": "This report analyzes Q1 2024 sales performance showing 25% growth.",
    "paragraph": "The Q1 2024 sales report demonstrates strong performance across all product lines. Revenue increased by 25% compared to the previous quarter, driven primarily by the launch of three new products. Customer satisfaction metrics improved significantly, with an average rating of 4.5/5 stars.",
    "executive": "...",
    "chapters": [
      {
        "chapter": "Introduction",
        "title": "Overview of Q1 Performance",
        "summary": "This section introduces the quarterly performance metrics..."
      }
    ],
    "bulletPoints": [
      "Revenue up 25% YoY",
      "Three new product launches",
      "Customer satisfaction at 4.5/5"
    ]
  }
}
```

```bash
# Generate specific summary level
POST /api/ai/documents/:documentId/summarize?level=one-sentence
POST /api/ai/documents/:documentId/summarize?level=paragraph
POST /api/ai/documents/:documentId/summarize?level=executive
POST /api/ai/documents/:documentId/summarize?level=chapters
POST /api/ai/documents/:documentId/summarize?level=bullets
```

```bash
# Rewrite content in different tone
POST /api/ai/documents/:documentId/rewrite
Content-Type: application/json
Authorization: Bearer <token>

# Request
{
  "tone": "casual"  // Options: formal, casual, technical, simple
}

# Response
{
  "success": true,
  "documentId": "abc123",
  "originalTone": "neutral",
  "newTone": "casual",
  "rewritten": "Hey! So here's the deal with our Q1 sales - they were pretty awesome! We saw a solid 25% jump..."
}
```

```bash
# Generate title suggestions
POST /api/ai/documents/:documentId/generate-titles?count=5
Authorization: Bearer <token>

# Response
{
  "success": true,
  "documentId": "abc123",
  "currentTitle": "Document 1",
  "suggestions": [
    "Q1 2024 Sales Performance: A 25% Growth Story",
    "Quarterly Revenue Analysis: Breaking Records in Q1",
    "Sales Excellence: Q1 2024 Performance Review",
    "First Quarter 2024: Sales Growth and Product Success",
    "Q1 Performance Report: Revenue, Products, and Satisfaction"
  ],
  "recommended": "Q1 2024 Sales Performance: A 25% Growth Story"
}
```

```bash
# Generate combined report from multiple documents
POST /api/ai/documents/generate-report
Content-Type: application/json
Authorization: Bearer <token>

# Request
{
  "documentIds": ["doc1", "doc2", "doc3"]
}

# Response
{
  "success": true,
  "documentCount": 3,
  "report": "# Comprehensive Report\n\n## Executive Summary\n..."
}
```

```bash
# Extract action items
POST /api/ai/documents/:documentId/action-items
Authorization: Bearer <token>

# Response
{
  "success": true,
  "documentId": "abc123",
  "actionItems": [
    "Review Q3 sales targets",
    "Prepare marketing materials for new products",
    "Schedule customer feedback session"
  ],
  "count": 3
}
```

```bash
# Generate Q&A pairs for training
POST /api/ai/documents/:documentId/generate-qa?count=5
Authorization: Bearer <token>

# Response
{
  "success": true,
  "documentId": "abc123",
  "qaPairs": [
    {
      "question": "What was the revenue growth in Q1 2024?",
      "answer": "Revenue increased by 25% year-over-year in Q1 2024."
    },
    {
      "question": "How many new products were launched?",
      "answer": "Three new products were launched during the quarter."
    }
  ],
  "count": 5
}
```

---

## 🔧 Technical Implementation

### Database Schema Updates

New fields added to `Document` model in Prisma schema:

```prisma
model Document {
  // ... existing fields

  // Phase 1: Enhanced AI features
  category         String?
  categories       String[]
  keyPoints        String[]
  summaries        Json?      // Stores all summary levels
  extractedEntities Json?     // Structured entity data
  readabilityScore Float?
  qualityScore     Float?
}
```

New fields added to `Image` model:

```prisma
model Image {
  // ... existing fields

  // Phase 1: Gemini Vision features
  visualAnalysis   Json?
  extractedData    Json?      // For charts/tables
  detectedObjects  String[]
  imageCategory    String?
  hasText          Boolean    @default(false)
  hasChart         Boolean    @default(false)
  hasDiagram       Boolean    @default(false)
}
```

### New Services

1. **geminiVisionService** (`src/services/geminiVisionService.ts`)
   - Image analysis
   - Chart data extraction
   - Diagram analysis
   - Visual question answering
   - Image comparison

2. **documentCategorizationService** (`src/services/documentCategorizationService.ts`)
   - Document categorization
   - Entity extraction
   - Key points extraction
   - Quality assessment
   - Language detection
   - Sentiment analysis

3. **summarizationService** (`src/services/summarizationService.ts`)
   - Multi-level summarization
   - Content rewriting
   - Title generation
   - Report generation
   - Action item extraction
   - Q&A pair generation

### New Controllers

1. **visionController** (`src/controllers/visionController.ts`)
2. **aiFeaturesController** (`src/controllers/aiFeaturesController.ts`)

### New Routes

1. `/api/vision/*` - Vision-related endpoints
2. `/api/ai/*` - AI features (categorization, summarization)

---

## 📊 Usage Examples

### Complete Document Processing Workflow

```bash
# 1. Upload document
curl -X POST http://localhost:3000/api/documents/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@document.pdf"

# Response: { "id": "doc123", ... }

# 2. Categorize document
curl -X POST http://localhost:3000/api/ai/documents/doc123/categorize \
  -H "Authorization: Bearer YOUR_TOKEN"

# 3. Extract entities
curl -X POST http://localhost:3000/api/ai/documents/doc123/extract-entities \
  -H "Authorization: Bearer YOUR_TOKEN"

# 4. Generate all summaries
curl -X POST "http://localhost:3000/api/ai/documents/doc123/summarize?level=all" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 5. Extract key points
curl -X POST "http://localhost:3000/api/ai/documents/doc123/key-points?maxPoints=10" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 6. Assess quality
curl -X POST http://localhost:3000/api/ai/documents/doc123/assess-quality \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Image Analysis Workflow

```bash
# 1. Analyze image
curl -X POST http://localhost:3000/api/vision/analyze \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@chart.png"

# 2. If it's a chart, extract data
curl -X POST http://localhost:3000/api/vision/extract-chart \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@chart.png"

# 3. Ask questions about it
curl -X POST http://localhost:3000/api/vision/ask \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@chart.png" \
  -F "question=What is the overall trend?"
```

---

## 🎯 Google AI Free Tier Limits

Phase 1 uses these Google AI models:

1. **Gemini 1.5 Flash**
   - 15 RPM (requests per minute)
   - 1,500 RPD (requests per day)
   - Used for: Categorization, entity extraction, summarization

2. **Gemini 2.0 Flash Exp**
   - Similar limits
   - Used for: Advanced analysis

3. **Text Embedding 004**
   - 60 RPM
   - Already in use (existing feature)

The system implements automatic fallbacks when API limits are reached or errors occur.

---

## 🔐 Authentication

All Phase 1 endpoints require JWT authentication:

```bash
# Login to get token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# Use token in subsequent requests
curl -X POST http://localhost:3000/api/vision/analyze \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@image.jpg"
```

---

## ⚡ Performance Considerations

1. **Caching**: Redis caching is used for:
   - AI responses (where applicable)
   - Embedding results
   - Language detection

2. **Async Processing**: All AI operations are async and non-blocking

3. **Fallbacks**: Every AI feature has a fallback mechanism:
   - If Gemini Vision fails → use basic image metadata
   - If entity extraction fails → use regex patterns
   - If summarization fails → use extractive summary

4. **Rate Limiting**: Standard rate limits apply to all endpoints

---

## 🐛 Error Handling

All endpoints follow consistent error response format:

```json
{
  "error": "Description of what went wrong",
  "code": "ERROR_CODE",
  "details": {}
}
```

Common error codes:
- `400` - Bad request (missing parameters, invalid input)
- `401` - Unauthorized (invalid or missing token)
- `404` - Document/resource not found
- `429` - Rate limit exceeded
- `500` - Internal server error (AI service unavailable, etc.)

---

## 📈 Future Enhancements (Phase 2+)

Phase 1 lays the foundation for:
- ✅ Conversational Document Assistant (multi-turn chat)
- ✅ Code Intelligence (code documentation, explanation)
- ✅ Multilingual Processing (translation, cross-lingual search)
- ✅ Knowledge Graph Generation
- ✅ Document Comparison & Diff
- ✅ Content Moderation & Safety

---

## 🧪 Testing

Test the features using the provided curl examples or use tools like Postman/Insomnia.

Example Postman collection structure:
```
Phase 1 Features
├── Vision
│   ├── Analyze Image
│   ├── Extract Chart Data
│   ├── Analyze Diagram
│   ├── Visual QA
│   └── Compare Images
├── Categorization
│   ├── Categorize Document
│   ├── Extract Entities
│   ├── Extract Key Points
│   └── Assess Quality
└── Summarization
    ├── Generate All Summaries
    ├── Rewrite Content
    ├── Generate Titles
    ├── Generate Report
    ├── Extract Action Items
    └── Generate Q&A Pairs
```

---

## 📝 Notes

1. **Automatic Processing**: When documents are uploaded, they automatically benefit from Phase 1 AI features:
   - Language is detected using AI
   - Entities are extracted using AI
   - Summaries are generated using AI
   - Sentiment is analyzed using AI

2. **Images in Documents**: Images within uploaded PDFs/documents are automatically:
   - Analyzed with Gemini Vision
   - Processed for charts/diagrams if detected
   - Enhanced with AI-generated descriptions

3. **Cost Optimization**: The system uses Google's free tier efficiently:
   - Caching reduces redundant API calls
   - Fallbacks prevent unnecessary retries
   - Batch processing where possible

---

## 🚀 Quick Start

1. Ensure your `.env` has `GOOGLE_AI_API_KEY` set
2. Run database migration: `bun run db:push`
3. Start the server: `bun run dev`
4. Test with curl or Postman using examples above

---

## Support

For issues or questions about Phase 1 features, refer to:
- Main README.md for setup instructions
- API endpoint documentation above
- Code comments in service files
- Error messages in responses
