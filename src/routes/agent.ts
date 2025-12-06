import express from "express";
import { body } from "express-validator";
import { agentController } from "../controllers/index.js";
import authMiddleware from "../middleware/authMiddleware.js";
import { rateLimitMiddleware, uploadMiddleware } from "../middleware/index.js";

const router = express.Router();

// Apply authentication
router.use(authMiddleware.requireAuth);

// Unified Chat Endpoint
// Handles text, images, and file uploads in a single stream
router.post(
	"/chat",
	rateLimitMiddleware.aiQueryRateLimit,
	uploadMiddleware.uploadSingle, // Optional file upload
	uploadMiddleware.handleUploadError,
	[
		body("message").notEmpty().withMessage("Message is required"),
		body("sessionId").optional().isString(),
	],
	agentController.chatHandler,
);

// Get Chat History
router.get("/history", agentController.getHistoryHandler);

// Get Analytics (Admin only in real app, open for demo)
router.get("/analytics", agentController.getAnalyticsHandler);

export default router;
