import express from "express";
import { body, query } from "express-validator";
import { aiFeaturesController } from "../controllers/index.js";
import authMiddleware from "../middleware/authMiddleware.js";
import rateLimitMiddleware from "../middleware/rateLimit.js";

const router = express.Router();

// Apply authentication to all routes
router.use(authMiddleware.authenticateToken);

// ==================== CATEGORIZATION ROUTES ====================

// Categorize document
router.post(
	"/documents/:documentId/categorize",
	rateLimitMiddleware.searchRateLimit,
	aiFeaturesController.categorizeDocumentHandler,
);

// Extract entities from document
router.post(
	"/documents/:documentId/extract-entities",
	rateLimitMiddleware.searchRateLimit,
	aiFeaturesController.extractEntitiesHandler,
);

// Extract key points from document
router.post(
	"/documents/:documentId/key-points",
	rateLimitMiddleware.searchRateLimit,
	[query("maxPoints").optional().isInt({ min: 1, max: 20 })],
	aiFeaturesController.extractKeyPointsHandler,
);

// Assess document quality
router.post(
	"/documents/:documentId/assess-quality",
	rateLimitMiddleware.searchRateLimit,
	aiFeaturesController.assessDocumentQualityHandler,
);

// ==================== SUMMARIZATION ROUTES ====================

// Generate summaries (all levels or specific level)
router.post(
	"/documents/:documentId/summarize",
	rateLimitMiddleware.searchRateLimit,
	[
		query("level")
			.optional()
			.isIn([
				"all",
				"one-sentence",
				"paragraph",
				"executive",
				"chapters",
				"bullets",
			]),
	],
	aiFeaturesController.generateSummariesHandler,
);

// Rewrite content in different tone
router.post(
	"/documents/:documentId/rewrite",
	rateLimitMiddleware.searchRateLimit,
	[
		body("tone")
			.notEmpty()
			.isIn(["formal", "casual", "technical", "simple"])
			.withMessage("Tone must be one of: formal, casual, technical, simple"),
	],
	aiFeaturesController.rewriteContentHandler,
);

// Generate title suggestions
router.post(
	"/documents/:documentId/generate-titles",
	rateLimitMiddleware.searchRateLimit,
	[query("count").optional().isInt({ min: 1, max: 10 })],
	aiFeaturesController.generateTitlesHandler,
);

// Generate combined report from multiple documents
router.post(
	"/documents/generate-report",
	rateLimitMiddleware.searchRateLimit,
	[
		body("documentIds")
			.isArray({ min: 1 })
			.withMessage("Document IDs array is required"),
	],
	aiFeaturesController.generateReportHandler,
);

// Extract action items
router.post(
	"/documents/:documentId/action-items",
	rateLimitMiddleware.searchRateLimit,
	aiFeaturesController.extractActionItemsHandler,
);

// Generate Q&A pairs for training
router.post(
	"/documents/:documentId/generate-qa",
	rateLimitMiddleware.searchRateLimit,
	[query("count").optional().isInt({ min: 1, max: 20 })],
	aiFeaturesController.generateQAPairsHandler,
);

export default router;
