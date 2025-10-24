import express from "express";
import { body, query } from "express-validator";
import { documentController } from "../controllers/index.js";
import authMiddleware from "../middleware/authMiddleware.js";
import rateLimitMiddleware from "../middleware/rateLimit.js";
import uploadMiddleware from "../middleware/upload.js";

const router = express.Router();

// Apply authentication to all routes
router.use(authMiddleware.requireAuth);

// Upload single document
router.post(
	"/upload",
	rateLimitMiddleware.uploadRateLimit,
	uploadMiddleware.uploadSingle,
	uploadMiddleware.handleUploadError,
	documentController.uploadDocumentHandler,
);

// Batch upload documents
router.post(
	"/batch-upload",
	rateLimitMiddleware.uploadRateLimit,
	uploadMiddleware.uploadMultiple,
	uploadMiddleware.handleUploadError,
	documentController.batchUploadHandler,
);

// Get user documents
router.get(
	"/",
	[
		query("page").optional().isInt({ min: 1 }),
		query("limit").optional().isInt({ min: 1, max: 100 }),
		query("search").optional().isString(),
		query("fileType").optional().isString(),
		query("sortBy").optional().isIn(["createdAt", "title", "fileSize"]),
		query("sortOrder").optional().isIn(["asc", "desc"]),
	],
	documentController.getDocumentsHandler,
);

// Vector Search Routes (must be before /:id route to avoid conflicts)

// Semantic search using vector embeddings
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
		query("numCandidates").optional().isInt({ min: 10, max: 200 }),
		query("textWeight").optional().isFloat({ min: 0, max: 1 }),
		query("vectorWeight").optional().isFloat({ min: 0, max: 1 }),
	],
	documentController.hybridSearchHandler,
);

// Enhanced search that combines traditional text search with vector search
router.get(
	"/enhanced-search",
	[
		query("query").notEmpty().withMessage("Search query is required"),
		query("page").optional().isInt({ min: 1 }),
		query("limit").optional().isInt({ min: 1, max: 50 }),
		query("fileType").optional().isString(),
		query("useVector").optional().isBoolean(),
		query("vectorWeight").optional().isFloat({ min: 0, max: 1 }),
	],
	documentController.enhancedSearchHandler,
);

// Get vector search statistics
router.get("/search-stats", documentController.searchStatsHandler);

// Find similar documents to a given document
router.get(
	"/:id/similar",
	[
		query("limit").optional().isInt({ min: 1, max: 20 }),
		query("numCandidates").optional().isInt({ min: 10, max: 100 }),
	],
	documentController.findSimilarDocumentsHandler,
);

// Get single document
router.get("/:id", documentController.getDocumentHandler);

// Delete document
router.delete("/:id", documentController.deleteDocumentHandler);

// Update document metadata
router.patch(
	"/:id",
	[
		body("title").optional().isString().trim(),
		body("summary").optional().isString().trim(),
	],
	documentController.updateDocumentHandler,
);

export default router;
