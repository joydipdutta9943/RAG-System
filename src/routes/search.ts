import express from "express";
import { body, query } from "express-validator";
import { searchController } from "../controllers/index.js";
import authMiddleware from "../middleware/authMiddleware.js";
import { rateLimitMiddleware, uploadMiddleware } from "../middleware/index.js";
import { aiAgentLangchainService } from "../services/index.js";

const router = express.Router();

// Initialize AI agent
aiAgentLangchainService.initialize();

// Apply authentication to all routes
router.use(authMiddleware.requireAuth);

// Text search
router.post(
	"/text",
	[
		body("query").isString().trim().isLength({ min: 1, max: 1000 }),
		body("filters").optional().isObject(),
		body("limit").optional().isInt({ min: 1, max: 50 }),
	],
	searchController.textSearchHandler,
);

// Image search
router.post(
	"/image",
	rateLimitMiddleware.aiQueryRateLimit,
	uploadMiddleware.uploadSingle,
	uploadMiddleware.handleUploadError,
	[
		query("query").optional().isString().trim(),
		query("limit").optional().isInt({ min: 1, max: 50 }),
	],
	searchController.imageSearchHandler,
);

// Multimodal search
router.post(
	"/multimodal",
	rateLimitMiddleware.aiQueryRateLimit,
	uploadMiddleware.uploadSingle,
	uploadMiddleware.handleUploadError,
	[
		body("query").isString().trim().isLength({ min: 1, max: 1000 }),
		body("filters").optional().isObject(),
		body("limit").optional().isInt({ min: 1, max: 50 }),
	],
	searchController.multimodalSearchHandler,
);

// Get search history
router.get(
	"/history",
	[
		query("page").optional().isInt({ min: 1 }),
		query("limit").optional().isInt({ min: 1, max: 100 }),
		query("queryType").optional().isIn(["TEXT", "IMAGE", "MULTIMODAL"]),
	],
	searchController.searchHistoryHandler,
);

// Get AI agent status and quota
router.get("/ai-status", searchController.aiStatusHandler);

export default router;
