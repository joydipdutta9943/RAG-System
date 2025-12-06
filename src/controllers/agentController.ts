import type express from "express";
import { validationResult } from "express-validator";
import { prisma } from "../config/database.js";
import { logger } from "../config/logger.js";
import { aiAgentLangchainService } from "../services/index.js";
import type { AuthenticatedRequest } from "../types/authTypes.js";

const chatHandler = async (
	req: AuthenticatedRequest,
	res: express.Response,
): Promise<express.Response> => {
	try {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ errors: errors.array() });
		}

		const userId = req.user?.id;
		const { message, sessionId } = req.body;

		if (!message) {
			return res.status(400).json({ error: "Message is required" });
		}

		logger.info(`Agent chat request from user: ${userId}`);

		// Process message with the unified agent
		const response = await aiAgentLangchainService.processAgentMessage(
			userId,
			message,
			sessionId,
			req.file, // Pass uploaded file if any
		);

		return res.json({
			success: true,
			response: response.content,
			toolsUsed: response.toolsUsed,
			sessionId: response.sessionId,
		});
	} catch (error) {
		logger.error("Agent chat error:", error);
		return res.status(500).json({ error: "Agent failed to process request" });
	}
};

const getHistoryHandler = async (
	req: AuthenticatedRequest,
	res: express.Response,
): Promise<express.Response> => {
	try {
		const userId = req.user?.id;
		const history = await prisma.chatHistory.findMany({
			where: { userId },
			orderBy: { createdAt: "desc" },
			take: 50,
		});
		return res.json({ history });
	} catch (error) {
		logger.error("Get history error:", error);
		return res.status(500).json({ error: "Failed to fetch history" });
	}
};

const getAnalyticsHandler = async (
	req: AuthenticatedRequest,
	res: express.Response,
): Promise<express.Response> => {
	try {
		// Admin only check could go here
		const analytics = await prisma.analytics.findMany({
			orderBy: { timestamp: "desc" },
			take: 100,
		});
		return res.json({ analytics });
	} catch (error) {
		logger.error("Get analytics error:", error);
		return res.status(500).json({ error: "Failed to fetch analytics" });
	}
};

const agentController = {
	chatHandler,
	getHistoryHandler,
	getAnalyticsHandler,
};

export default agentController;
