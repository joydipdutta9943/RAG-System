import express from "express";
import { body } from "express-validator";
import { visionController } from "../controllers/index.js";
import authMiddleware from "../middleware/authMiddleware.js";
import rateLimitMiddleware from "../middleware/rateLimit.js";
import uploadMiddleware from "../middleware/upload.js";

const router = express.Router();

// Apply authentication to all routes
router.use(authMiddleware.authenticateToken);

// Analyze image with Gemini Vision
router.post(
	"/analyze",
	rateLimitMiddleware.searchRateLimit,
	uploadMiddleware.uploadSingle,
	uploadMiddleware.handleUploadError,
	visionController.analyzeImageHandler,
);

// Extract chart/graph data from image
router.post(
	"/extract-chart",
	rateLimitMiddleware.searchRateLimit,
	uploadMiddleware.uploadSingle,
	uploadMiddleware.handleUploadError,
	visionController.extractChartDataHandler,
);

// Analyze diagram/flowchart
router.post(
	"/analyze-diagram",
	rateLimitMiddleware.searchRateLimit,
	uploadMiddleware.uploadSingle,
	uploadMiddleware.handleUploadError,
	visionController.analyzeDiagramHandler,
);

// Visual question answering
router.post(
	"/ask",
	rateLimitMiddleware.searchRateLimit,
	uploadMiddleware.uploadSingle,
	uploadMiddleware.handleUploadError,
	[body("question").notEmpty().withMessage("Question is required")],
	visionController.visualQuestionHandler,
);

// Compare two images
router.post(
	"/compare",
	rateLimitMiddleware.searchRateLimit,
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
