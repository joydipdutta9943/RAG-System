import type { Prisma } from "@prisma/client";
import type express from "express";
import { validationResult } from "express-validator";
import { prisma } from "../config/database.js";
import { logger } from "../config/logger.js";
import {
	aiAgentLangchainService,
	vectorSearchService,
} from "../services/index.js";
import type { AuthenticatedRequest } from "../types/authTypes.js";
import type { SearchFilter } from "../types/searchTypes.js";

// Define interfaces for request body and filters
interface DateRange {
	start: string;
	end: string;
}

interface SearchFilters {
	documentType?: string[];
	dateRange?: DateRange;
}

interface TextSearchRequestBody {
	query: string;
	filters?: SearchFilters;
	limit?: number;
}

const textSearchHandler = async (
	req: AuthenticatedRequest,
	res: express.Response,
): Promise<express.Response> => {
	try {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ errors: errors.array() });
		}

		const userId = req.user?.id;
		const {
			query,
			filters = {},
			limit = 10,
		} = req.body as TextSearchRequestBody;
		const startTime = Date.now();

		logger.info(`Text search query: "${query}" by user: ${userId}`);

		const vectorFilter: SearchFilter = { userId };
		if (filters.documentType && filters.documentType.length > 0) {
			vectorFilter.fileType = filters.documentType;
		}

		let vectorResults = await vectorSearchService.vectorSearch(query, {
			limit: Math.min(limit * 2, 50),
			numCandidates: Math.max(limit * 5, 50),
			filter: vectorFilter,
		});

		// Optional post-filter by date range
		if (filters.dateRange) {
			const start = new Date(filters.dateRange.start);
			const end = new Date(filters.dateRange.end);
			vectorResults = vectorResults.filter((r) => {
				const createdAt = r.metadata?.createdAt
					? new Date(r.metadata.createdAt)
					: undefined;
				return createdAt && createdAt >= start && createdAt <= end;
			});
		}

		// Use top N results for AI
		const resultsForAi = vectorResults.slice(0, limit);

		// Fallback to traditional Prisma text search if no vector results
		if (resultsForAi.length === 0) {
			logger.info(
				"Vector search returned no results, falling back to text search",
			);

			const fallbackWhere: Prisma.DocumentWhereInput = { userId };
			if (query) {
				fallbackWhere.OR = [
					{ title: { contains: query, mode: "insensitive" } },
					{ content: { contains: query, mode: "insensitive" } },
				];
			}
			if (filters.documentType) {
				const documentTypes = Array.isArray(filters.documentType)
					? filters.documentType
					: [filters.documentType];
				fallbackWhere.fileType = { in: documentTypes };
			}
			if (filters.dateRange) {
				fallbackWhere.createdAt = {
					gte: new Date(filters.dateRange.start),
					lte: new Date(filters.dateRange.end),
				};
			}

			const fallbackDocs = await prisma.document.findMany({
				where: fallbackWhere,
				select: {
					id: true,
					title: true,
					content: true,
					summary: true,
					fileType: true,
					createdAt: true,
				},
				take: limit,
				orderBy: { createdAt: "desc" },
			});

			// Prepare context for AI agent from fallback (full content)
			const fallbackContext = fallbackDocs.map(
				(doc) => `Title: ${doc.title}\nContent: ${doc.content}`,
			);
			const fallbackAiResponse = await aiAgentLangchainService.processQuery(
				query,
				fallbackContext,
			);

			const savedQuery = await prisma.query.create({
				data: {
					query,
					queryType: "TEXT",
					response: fallbackAiResponse.response,
					sources: fallbackDocs.map((r) => r.id),
					confidence: fallbackAiResponse.confidence,
					processingTime: Date.now() - startTime,
					modelUsed: fallbackAiResponse.model,
					metadata: {
						filters: filters as Prisma.InputJsonValue,
						resultCount: fallbackDocs.length,
						searchType: "fallback_text",
					},
					userId,
					documentIds: fallbackDocs.map((r) => r.id),
				},
			});

			return res.json({
				query: savedQuery.query,
				response: fallbackAiResponse.response,
				sources: fallbackDocs.map((r) => ({
					id: r.id,
					title: r.title,
					summary: r.summary || null,
					fileType: r.fileType,
					createdAt: r.createdAt,
				})),
				metadata: {
					processingTime: fallbackAiResponse.processingTime,
					model: fallbackAiResponse.model,
					confidence: fallbackAiResponse.confidence,
					totalResults: fallbackDocs.length,
				},
			});
		}

		// Enrich vector results with Prisma metadata to keep response shape
		const ids = resultsForAi.map((r) => r.id);
		const details = await prisma.document.findMany({
			where: { id: { in: ids }, userId },
			select: {
				id: true,
				title: true,
				summary: true,
				fileType: true,
				createdAt: true,
			},
		});
		const detailsMap = new Map(details.map((d) => [d.id, d]));

		// Prepare context for AI agent from vector results (full content)
		const context = resultsForAi.map(
			(doc) => `Title: ${doc.title}\nContent: ${doc.content}`,
		);

		// Generate AI response
		const aiResponse = await aiAgentLangchainService.processQuery(
			query,
			context,
		);

		// Save query to database
		const savedQuery = await prisma.query.create({
			data: {
				query,
				queryType: "TEXT",
				response: aiResponse.response,
				sources: ids,
				confidence: aiResponse.confidence,
				processingTime: Date.now() - startTime,
				modelUsed: aiResponse.model,
				metadata: {
					filters: filters as Prisma.InputJsonValue,
					resultCount: resultsForAi.length,
					searchType: "vector",
				},
				userId,
				documentIds: ids,
			},
		});

		return res.json({
			query: savedQuery.query,
			response: aiResponse.response,
			sources: ids.map((id) => {
				const d = detailsMap.get(id);
				return {
					id,
					title: d?.title ?? resultsForAi.find((r) => r.id === id)?.title,
					summary: d?.summary ?? null,
					fileType: d?.fileType ?? null,
					createdAt: d?.createdAt ?? null,
				};
			}),
			metadata: {
				processingTime: aiResponse.processingTime,
				model: aiResponse.model,
				confidence: aiResponse.confidence,
				totalResults: resultsForAi.length,
			},
		});
	} catch (error) {
		logger.error("Text search error:", error);
		return res.status(500).json({ error: "Search failed" });
	}
};

const imageSearchHandler = async (
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
		const { query = "", limit = 10 } = req.body;
		const startTime = Date.now();

		logger.info(`Image search by user: ${userId}`);

		// Find images from user's documents
		const images = await prisma.image.findMany({
			where: {
				document: { userId },
			},
			include: {
				document: {
					select: {
						id: true,
						title: true,
						content: true,
						summary: true,
						fileType: true,
						createdAt: true,
					},
				},
			},
			take: limit,
			orderBy: { createdAt: "desc" },
		});

		const imageResults = images;

		// Prepare context for AI agent
		const imageContext = imageResults.map(
			(img) =>
				`Image: ${img.description || "No description"}\nOCR Text: ${img.ocrText || "No text"}`,
		);
		const textContext = imageResults.map(
			(img) =>
				`Document: ${img.document.title}\nContent: ${img.document.content}`,
		);

		// Generate AI response
		const aiResponse = await aiAgentLangchainService.processImageQuery(
			query,
			imageContext,
			textContext,
		);

		// Save query to database
		const savedQuery = await prisma.query.create({
			data: {
				query: query || "Image similarity search",
				queryType: "IMAGE",
				response: aiResponse.response,
				sources: imageResults.map((r) => r.document.id),
				confidence: aiResponse.confidence,
				processingTime: Date.now() - startTime,
				modelUsed: aiResponse.model,
				metadata: { resultCount: imageResults.length },
				userId,
			},
		});

		return res.json({
			query: savedQuery.query,
			response: aiResponse.response,
			sources: imageResults.map((r) => ({
				imageId: r.id,
				documentId: r.document.id,
				documentTitle: r.document.title,
				description: r.description,
				ocrText: r.ocrText,
			})),
			metadata: {
				processingTime: aiResponse.processingTime,
				model: aiResponse.model,
				confidence: aiResponse.confidence,
				totalResults: imageResults.length,
			},
		});
	} catch (error) {
		logger.error("Image search error:", error);
		return res.status(500).json({ error: "Image search failed" });
	}
};

const multimodalSearchHandler = async (
	req: AuthenticatedRequest,
	res: express.Response,
): Promise<express.Response> => {
	try {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ errors: errors.array() });
		}

		const userId = req.user?.id;
		const { query, filters = {}, limit = 10 } = req.body;
		const startTime = Date.now();

		logger.info(`Multimodal search query: "${query}" by user: ${userId}`);

		// Search documents using traditional text search
		const whereClause: Prisma.DocumentWhereInput = { userId };
		if (query) {
			whereClause.OR = [
				{ title: { contains: query, mode: "insensitive" } },
				{ content: { contains: query, mode: "insensitive" } },
			];
		}

		const documents = await prisma.document.findMany({
			where: whereClause,
			include: {
				images: true,
			},
			take: limit,
			orderBy: { createdAt: "desc" },
		});

		// Prepare text results
		const textResults = documents.map((doc) => ({
			...doc,
			type: "text" as const,
		}));

		// Simplified multimodal search - just use text for now
		// Future enhancement: Add proper image processing when needed
		const imageContext = req.file
			? [`Image provided: ${req.file.originalname}`]
			: [];

		// Prepare context for AI agent
		const textContext = textResults
			.slice(0, 5)
			.map((doc) => `Title: ${doc.title}\nContent: ${doc.content}`);

		// Generate AI response
		const aiResponse = await aiAgentLangchainService.processImageQuery(
			query,
			imageContext,
			textContext,
		);

		// Save query to database
		const savedQuery = await prisma.query.create({
			data: {
				query,
				queryType: "MULTIMODAL",
				response: aiResponse.response,
				sources: textResults.map((r) => r.id),
				confidence: aiResponse.confidence,
				processingTime: Date.now() - startTime,
				modelUsed: aiResponse.model,
				metadata: {
					filters,
					textResults: textResults.length,
					imageResults: imageContext.length,
					hasImageQuery: !!req.file,
				},
				userId,
			},
		});

		return res.json({
			query: savedQuery.query,
			response: aiResponse.response,
			sources: textResults.map((r) => ({
				id: r.id,
				title: r.title,
				type: "text" as const,
			})),
			metadata: {
				processingTime: aiResponse.processingTime,
				model: aiResponse.model,
				confidence: aiResponse.confidence,
				totalResults: textResults.length,
			},
		});
	} catch (error) {
		logger.error("Multimodal search error:", error);
		return res.status(500).json({ error: "Multimodal search failed" });
	}
};

const searchHistoryHandler = async (
	req: AuthenticatedRequest,
	res: express.Response,
): Promise<express.Response> => {
	try {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ errors: errors.array() });
		}

		const userId = req.user?.id;
		const page = parseInt(req.query.page as string, 10) || 1;
		const limit = parseInt(req.query.limit as string, 10) || 20;
		const queryType = req.query.queryType as string;

		const skip = (page - 1) * limit;
		const where: Record<string, unknown> = { userId };

		if (queryType) {
			where.queryType = queryType;
		}

		const [queries, total] = await Promise.all([
			prisma.query.findMany({
				where,
				select: {
					id: true,
					query: true,
					queryType: true,
					response: true,
					confidence: true,
					processingTime: true,
					modelUsed: true,
					createdAt: true,
				},
				orderBy: { createdAt: "desc" },
				skip,
				take: limit,
			}),
			prisma.query.count({ where }),
		]);

		return res.json({
			queries,
			pagination: {
				page,
				limit,
				total,
				pages: Math.ceil(total / limit),
			},
		});
	} catch (error) {
		logger.error("Error fetching search history:", error);
		return res.status(500).json({ error: "Failed to fetch search history" });
	}
};

const aiStatusHandler = async (
	_req: AuthenticatedRequest,
	res: express.Response,
): Promise<express.Response> => {
	try {
		const quota = await aiAgentLangchainService.getRemainingQuota();

		const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";

		return res.json({
			quotaRemaining: quota,
			status: "operational",
			currentModel: modelName,
			models: {
				[modelName]: {
					available: quota.geminiPro > 0 || quota.gemini15 > 0,
					remainingPro: quota.geminiPro,
					remainingStandard: quota.gemini15,
					dailyLimitPro: 100,
					dailyLimitStandard: 1500,
				},
			},
		});
	} catch (error) {
		logger.error("Error fetching AI status:", error);
		return res.status(500).json({ error: "Failed to fetch AI status" });
	}
};

const searchController = {
	textSearchHandler,
	imageSearchHandler,
	multimodalSearchHandler,
	searchHistoryHandler,
	aiStatusHandler,
};

export default searchController;
