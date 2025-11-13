import type express from "express";
import { validationResult } from "express-validator";
import { prisma } from "../config/database.js";
import { logger } from "../config/logger.js";
import { geminiVisionService } from "../services/index.js";
import type { AuthenticatedRequest } from "../types/authTypes.js";

const analyzeImageHandler = async (
	req: AuthenticatedRequest,
	res: express.Response,
): Promise<express.Response> => {
	try {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ errors: errors.array() });
		}

		if (!req.file) {
			return res.status(400).json({ error: "Image file required" });
		}

		const userId = req.user?.id;
		logger.info(`Image analysis requested by user: ${userId}`);

		// Analyze image with Gemini Vision
		const analysis = await geminiVisionService.analyzeImage(req.file.buffer);

		return res.json({
			success: true,
			analysis,
		});
	} catch (error) {
		logger.error("Image analysis error:", error);
		return res.status(500).json({ error: "Image analysis failed" });
	}
};

const extractChartDataHandler = async (
	req: AuthenticatedRequest,
	res: express.Response,
): Promise<express.Response> => {
	try {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ errors: errors.array() });
		}

		if (!req.file) {
			return res.status(400).json({ error: "Image file required" });
		}

		const userId = req.user?.id;
		logger.info(`Chart data extraction requested by user: ${userId}`);

		// Extract chart data
		const chartData = await geminiVisionService.extractChartData(
			req.file.buffer,
		);

		return res.json({
			success: true,
			chartData,
		});
	} catch (error) {
		logger.error("Chart extraction error:", error);
		return res.status(500).json({ error: "Chart data extraction failed" });
	}
};

const analyzeDiagramHandler = async (
	req: AuthenticatedRequest,
	res: express.Response,
): Promise<express.Response> => {
	try {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ errors: errors.array() });
		}

		if (!req.file) {
			return res.status(400).json({ error: "Image file required" });
		}

		const userId = req.user?.id;
		logger.info(`Diagram analysis requested by user: ${userId}`);

		// Analyze diagram
		const diagramAnalysis = await geminiVisionService.analyzeDiagram(
			req.file.buffer,
		);

		return res.json({
			success: true,
			diagramAnalysis,
		});
	} catch (error) {
		logger.error("Diagram analysis error:", error);
		return res.status(500).json({ error: "Diagram analysis failed" });
	}
};

const visualQuestionHandler = async (
	req: AuthenticatedRequest,
	res: express.Response,
): Promise<express.Response> => {
	try {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ errors: errors.array() });
		}

		if (!req.file) {
			return res.status(400).json({ error: "Image file required" });
		}

		const { question } = req.body;
		if (!question) {
			return res.status(400).json({ error: "Question is required" });
		}

		const userId = req.user?.id;
		logger.info(
			`Visual question answering requested by user: ${userId}, question: ${question}`,
		);

		// Answer visual question
		const answer = await geminiVisionService.answerVisualQuestion(
			req.file.buffer,
			question,
		);

		return res.json({
			success: true,
			...answer,
		});
	} catch (error) {
		logger.error("Visual question answering error:", error);
		return res.status(500).json({ error: "Visual question answering failed" });
	}
};

const compareImagesHandler = async (
	req: AuthenticatedRequest,
	res: express.Response,
): Promise<express.Response> => {
	try {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ errors: errors.array() });
		}

		const files = req.files as Express.Multer.File[];
		if (!files || files.length !== 2) {
			return res.status(400).json({ error: "Exactly two images are required" });
		}

		const userId = req.user?.id;
		logger.info(`Image comparison requested by user: ${userId}`);

		// Compare images
		const comparison = await geminiVisionService.compareImages(
			files[0].buffer,
			files[1].buffer,
		);

		return res.json({
			success: true,
			comparison,
		});
	} catch (error) {
		logger.error("Image comparison error:", error);
		return res.status(500).json({ error: "Image comparison failed" });
	}
};

const analyzeDocumentImageHandler = async (
	req: AuthenticatedRequest,
	res: express.Response,
): Promise<express.Response> => {
	try {
		const { documentId, imageId } = req.params;
		const userId = req.user?.id;

		// Fetch image from database
		const image = await prisma.image.findFirst({
			where: {
				id: imageId,
				document: {
					id: documentId,
					userId,
				},
			},
			include: {
				document: true,
			},
		});

		if (!image) {
			return res.status(404).json({ error: "Image not found" });
		}

		// For now, return existing analysis or placeholder
		// In production, you'd fetch the actual image data and re-analyze
		return res.json({
			success: true,
			imageId: image.id,
			documentId: image.documentId,
			visualAnalysis: image.visualAnalysis || null,
			extractedData: image.extractedData || null,
			detectedObjects: image.detectedObjects || [],
			imageCategory: image.imageCategory || "unknown",
		});
	} catch (error) {
		logger.error("Document image analysis error:", error);
		return res.status(500).json({ error: "Document image analysis failed" });
	}
};

const visionController = {
	analyzeImageHandler,
	extractChartDataHandler,
	analyzeDiagramHandler,
	visualQuestionHandler,
	compareImagesHandler,
	analyzeDocumentImageHandler,
};

export default visionController;
