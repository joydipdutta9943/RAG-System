import type express from "express";
import { validationResult } from "express-validator";
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

const agentController = {
	chatHandler,
};

export default agentController;
