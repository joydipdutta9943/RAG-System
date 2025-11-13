import express from "express";
import { body } from "express-validator";
import { visionController } from "../controllers/index.js";
import authMiddleware from "../middleware/authMiddleware.js";
import rateLimitMiddleware from "../middleware/rateLimit.js";
import uploadMiddleware from "../middleware/upload.js";

const router = express.Router();

// Apply authentication to all routes
router.use(authMiddleware.requireAuth);

// Analyze image with Gemini Vision
router.post(
	"/analyze",
	rateLimitMiddleware.aiQueryRateLimit,
	uploadMiddleware.uploadSingle,
	uploadMiddleware.handleUploadError,
	visionController.analyzeImageHandler,
);

// Extract chart/graph data from image
router.post(
	"/extract-chart",
	rateLimitMiddleware.aiQueryRateLimit,
	uploadMiddleware.uploadSingle,
	uploadMiddleware.handleUploadError,
	visionController.extractChartDataHandler,
);

// Analyze diagram/flowchart
router.post(
	"/analyze-diagram",
	rateLimitMiddleware.aiQueryRateLimit,
	uploadMiddleware.uploadSingle,
	uploadMiddleware.handleUploadError,
	visionController.analyzeDiagramHandler,
);

// Visual question answering
router.post(
	"/ask",
	rateLimitMiddleware.aiQueryRateLimit,
	uploadMiddleware.uploadSingle,
	uploadMiddleware.handleUploadError,
	[body("question").notEmpty().withMessage("Question is required")],
	visionController.visualQuestionHandler,
);

// Compare two images
router.post(
	"/compare",
	rateLimitMiddleware.aiQueryRateLimit,
	uploadMiddleware.uploadMultiple,
	uploadMiddleware.handleUploadError,
	visionController.compareImagesHandler,
);

// Analyze image from existing document
router.get(
	"/document/:documentId/image/:imageId",
	visionController.analyzeDocumentImageHandler,
);

export default router;
