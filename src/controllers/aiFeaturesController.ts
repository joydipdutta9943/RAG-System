import type express from "express";
import { validationResult } from "express-validator";
import { prisma } from "../config/database.js";
import { logger } from "../config/logger.js";
import {
	documentCategorizationService,
	summarizationService,
} from "../services/index.js";
import type { AuthenticatedRequest } from "../types/authTypes.js";

// Categorization endpoints

const categorizeDocumentHandler = async (
	req: AuthenticatedRequest,
	res: express.Response,
): Promise<express.Response> => {
	try {
		const { documentId } = req.params;
		const userId = req.user?.id;

		const document = await prisma.document.findFirst({
			where: { id: documentId, userId },
		});

		if (!document) {
			return res.status(404).json({ error: "Document not found" });
		}

		logger.info(`Categorizing document: ${documentId}`);

		const category = await documentCategorizationService.categorizeDocument(
			document.content,
			document.title,
			document.fileType,
		);

		// Update document with category
		await prisma.document.update({
			where: { id: documentId },
			data: {
				category: category.primary,
				categories: [category.primary, ...category.secondary],
			},
		});

		return res.json({
			success: true,
			documentId,
			category: category.primary,
			categories: [category.primary, ...category.secondary],
			confidence: category.confidence,
		});
	} catch (error) {
		logger.error("Document categorization error:", error);
		return res.status(500).json({ error: "Document categorization failed" });
	}
};

const extractEntitiesHandler = async (
	req: AuthenticatedRequest,
	res: express.Response,
): Promise<express.Response> => {
	try {
		const { documentId } = req.params;
		const userId = req.user?.id;

		const document = await prisma.document.findFirst({
			where: { id: documentId, userId },
		});

		if (!document) {
			return res.status(404).json({ error: "Document not found" });
		}

		logger.info(`Extracting entities from document: ${documentId}`);

		const extractedEntities =
			await documentCategorizationService.extractEntities(document.content);

		// Update document with extracted entities
		await prisma.document.update({
			where: { id: documentId },
			data: {
				extractedEntities: extractedEntities as any,
				entities: [
					...(extractedEntities.people || []),
					...(extractedEntities.organizations || []),
					...(extractedEntities.locations || []),
				],
			},
		});

		return res.json({
			success: true,
			documentId,
			entities: extractedEntities,
		});
	} catch (error) {
		logger.error("Entity extraction error:", error);
		return res.status(500).json({ error: "Entity extraction failed" });
	}
};

const extractKeyPointsHandler = async (
	req: AuthenticatedRequest,
	res: express.Response,
): Promise<express.Response> => {
	try {
		const { documentId } = req.params;
		const { maxPoints = 10 } = req.query;
		const userId = req.user?.id;

		const document = await prisma.document.findFirst({
			where: { id: documentId, userId },
		});

		if (!document) {
			return res.status(404).json({ error: "Document not found" });
		}

		logger.info(`Extracting key points from document: ${documentId}`);

		const keyPointsData = await documentCategorizationService.extractKeyPoints(
			document.content,
			Number(maxPoints),
		);

		// Update document with key points
		await prisma.document.update({
			where: { id: documentId },
			data: {
				keyPoints: keyPointsData.keyPoints,
				topics: keyPointsData.mainTopics,
			},
		});

		return res.json({
			success: true,
			documentId,
			keyPoints: keyPointsData.keyPoints,
			mainTopics: keyPointsData.mainTopics,
			actionItems: keyPointsData.actionItems,
		});
	} catch (error) {
		logger.error("Key points extraction error:", error);
		return res.status(500).json({ error: "Key points extraction failed" });
	}
};

const assessDocumentQualityHandler = async (
	req: AuthenticatedRequest,
	res: express.Response,
): Promise<express.Response> => {
	try {
		const { documentId } = req.params;
		const userId = req.user?.id;

		const document = await prisma.document.findFirst({
			where: { id: documentId, userId },
		});

		if (!document) {
			return res.status(404).json({ error: "Document not found" });
		}

		logger.info(`Assessing quality of document: ${documentId}`);

		const [qualityScore, readabilityScore] = await Promise.all([
			documentCategorizationService.assessDocumentQuality(
				document.content,
				document.title,
			),
			Promise.resolve(
				documentCategorizationService.calculateReadabilityScore(
					document.content,
				),
			),
		]);

		// Update document with scores
		await prisma.document.update({
			where: { id: documentId },
			data: {
				qualityScore,
				readabilityScore,
			},
		});

		return res.json({
			success: true,
			documentId,
			qualityScore,
			readabilityScore,
			qualityLevel:
				qualityScore >= 80 ? "Excellent" : qualityScore >= 60 ? "Good" : "Fair",
			readabilityLevel:
				readabilityScore >= 60
					? "Easy"
					: readabilityScore >= 30
						? "Moderate"
						: "Difficult",
		});
	} catch (error) {
		logger.error("Quality assessment error:", error);
		return res.status(500).json({ error: "Quality assessment failed" });
	}
};

// Summarization endpoints

const generateSummariesHandler = async (
	req: AuthenticatedRequest,
	res: express.Response,
): Promise<express.Response> => {
	try {
		const { documentId } = req.params;
		const { level = "all" } = req.query;
		const userId = req.user?.id;

		const document = await prisma.document.findFirst({
			where: { id: documentId, userId },
		});

		if (!document) {
			return res.status(404).json({ error: "Document not found" });
		}

		logger.info(
			`Generating summaries for document: ${documentId}, level: ${level}`,
		);

		let summaries: any = {};

		if (level === "all") {
			summaries = await summarizationService.generateAllSummaries(
				document.content,
			);
		} else if (level === "one-sentence") {
			summaries.oneSentence =
				await summarizationService.generateOneSentenceSummary(document.content);
		} else if (level === "paragraph") {
			summaries.paragraph = await summarizationService.generateParagraphSummary(
				document.content,
			);
		} else if (level === "executive") {
			summaries.executive = await summarizationService.generateExecutiveSummary(
				document.content,
			);
		} else if (level === "chapters") {
			summaries.chapters = await summarizationService.generateChapterSummaries(
				document.content,
			);
		} else if (level === "bullets") {
			summaries.bulletPoints = await summarizationService.generateBulletPoints(
				document.content,
			);
		}

		// Update document with summaries
		await prisma.document.update({
			where: { id: documentId },
			data: {
				summaries: summaries as any,
				summary: summaries.oneSentence || summaries.paragraph || null,
			},
		});

		return res.json({
			success: true,
			documentId,
			summaries,
		});
	} catch (error) {
		logger.error("Summary generation error:", error);
		return res.status(500).json({ error: "Summary generation failed" });
	}
};

const rewriteContentHandler = async (
	req: AuthenticatedRequest,
	res: express.Response,
): Promise<express.Response> => {
	try {
		const { documentId } = req.params;
		const { tone = "formal" } = req.body;
		const userId = req.user?.id;

		const document = await prisma.document.findFirst({
			where: { id: documentId, userId },
		});

		if (!document) {
			return res.status(404).json({ error: "Document not found" });
		}

		if (!["formal", "casual", "technical", "simple"].includes(tone)) {
			return res.status(400).json({
				error:
					"Invalid tone. Must be one of: formal, casual, technical, simple",
			});
		}

		logger.info(`Rewriting document ${documentId} in ${tone} tone`);

		const rewritten = await summarizationService.rewriteContent(
			document.content,
			tone as any,
		);

		return res.json({
			success: true,
			documentId,
			originalTone: "neutral",
			newTone: tone,
			rewritten: rewritten.rewritten,
		});
	} catch (error) {
		logger.error("Content rewriting error:", error);
		return res.status(500).json({ error: "Content rewriting failed" });
	}
};

const generateTitlesHandler = async (
	req: AuthenticatedRequest,
	res: express.Response,
): Promise<express.Response> => {
	try {
		const { documentId } = req.params;
		const { count = 5 } = req.query;
		const userId = req.user?.id;

		const document = await prisma.document.findFirst({
			where: { id: documentId, userId },
		});

		if (!document) {
			return res.status(404).json({ error: "Document not found" });
		}

		logger.info(`Generating title suggestions for document: ${documentId}`);

		const titleSuggestions = await summarizationService.generateTitles(
			document.content,
			Number(count),
		);

		return res.json({
			success: true,
			documentId,
			currentTitle: document.title,
			suggestions: titleSuggestions.titles,
			recommended: titleSuggestions.recommended,
		});
	} catch (error) {
		logger.error("Title generation error:", error);
		return res.status(500).json({ error: "Title generation failed" });
	}
};

const generateReportHandler = async (
	req: AuthenticatedRequest,
	res: express.Response,
): Promise<express.Response> => {
	try {
		const { documentIds } = req.body;
		const userId = req.user?.id;

		if (!Array.isArray(documentIds) || documentIds.length === 0) {
			return res.status(400).json({ error: "Document IDs array is required" });
		}

		logger.info(`Generating report from ${documentIds.length} documents`);

		const documents = await prisma.document.findMany({
			where: {
				id: { in: documentIds },
				userId,
			},
		});

		if (documents.length === 0) {
			return res.status(404).json({ error: "No documents found" });
		}

		const documentContents = documents.map((doc) => doc.content);
		const report = await summarizationService.generateReport(documentContents);

		return res.json({
			success: true,
			documentCount: documents.length,
			report,
		});
	} catch (error) {
		logger.error("Report generation error:", error);
		return res.status(500).json({ error: "Report generation failed" });
	}
};

const extractActionItemsHandler = async (
	req: AuthenticatedRequest,
	res: express.Response,
): Promise<express.Response> => {
	try {
		const { documentId } = req.params;
		const userId = req.user?.id;

		const document = await prisma.document.findFirst({
			where: { id: documentId, userId },
		});

		if (!document) {
			return res.status(404).json({ error: "Document not found" });
		}

		logger.info(`Extracting action items from document: ${documentId}`);

		const actionItems = await summarizationService.extractActionItems(
			document.content,
		);

		return res.json({
			success: true,
			documentId,
			actionItems,
			count: actionItems.length,
		});
	} catch (error) {
		logger.error("Action items extraction error:", error);
		return res.status(500).json({ error: "Action items extraction failed" });
	}
};

const generateQAPairsHandler = async (
	req: AuthenticatedRequest,
	res: express.Response,
): Promise<express.Response> => {
	try {
		const { documentId } = req.params;
		const { count = 5 } = req.query;
		const userId = req.user?.id;

		const document = await prisma.document.findFirst({
			where: { id: documentId, userId },
		});

		if (!document) {
			return res.status(404).json({ error: "Document not found" });
		}

		logger.info(`Generating Q&A pairs for document: ${documentId}`);

		const qaPairs = await summarizationService.generateQAPairs(
			document.content,
			Number(count),
		);

		return res.json({
			success: true,
			documentId,
			qaPairs,
			count: qaPairs.length,
		});
	} catch (error) {
		logger.error("Q&A pair generation error:", error);
		return res.status(500).json({ error: "Q&A pair generation failed" });
	}
};

const aiFeaturesController = {
	// Categorization
	categorizeDocumentHandler,
	extractEntitiesHandler,
	extractKeyPointsHandler,
	assessDocumentQualityHandler,

	// Summarization
	generateSummariesHandler,
	rewriteContentHandler,
	generateTitlesHandler,
	generateReportHandler,
	extractActionItemsHandler,
	generateQAPairsHandler,
};

export default aiFeaturesController;
