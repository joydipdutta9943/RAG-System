import type express from "express";
import { validationResult } from "express-validator";
import { prisma } from "../config/database.js";
import { logger } from "../config/logger.js";
import {
	documentProcessorService,
	embeddingService,
	vectorSearchService,
} from "../services/index.js";
import type { AuthenticatedRequest } from "../types/authTypes.js";

const uploadDocumentHandler = async (
	req: AuthenticatedRequest,
	res: express.Response,
): Promise<express.Response> => {
	try {
		if (!req.file) {
			return res.status(400).json({ error: "No file uploaded" });
		}

		const userId = req.user?.id;
		const file = req.file;

		logger.info(
			`Processing document upload: ${file.originalname} for user: ${userId}`,
		);

		// Process the document from buffer
		const processedDoc = await documentProcessorService.processDocument(
			file.buffer,
			file.originalname,
			file.mimetype,
			undefined, // redisClient - pass undefined for now
		);

		// Extract additional metadata
		const entities = await documentProcessorService.extractEntities(
			processedDoc.content,
		);
		const topics = documentProcessorService.extractTopics(processedDoc.content);
		const summary = await documentProcessorService.generateSummary(
			processedDoc.content,
		);
		const sentiment = await documentProcessorService.analyzeSentiment(
			processedDoc.content,
		);

		// Generate embedding for vector search
		const documentEmbedding = await embeddingService.generateTextEmbedding(
			`${processedDoc.title} ${processedDoc.content}`.trim(),
		);

		// Convert metadata to proper JSON format
		const metadataJson = JSON.parse(JSON.stringify(processedDoc.metadata));

		// Save document to Prisma database
		const document = await prisma.document.create({
			data: {
				title: processedDoc.title,
				content: processedDoc.content,
				fileType: file.mimetype,
				fileSize: file.size,
				embedding: documentEmbedding, // Store embedding in Prisma
				metadata: metadataJson,
				summary,
				entities,
				topics,
				sentiment,
				language: processedDoc.metadata.language,
				base64Content: file.buffer.toString("base64"),
				userId,
			},
			include: {},
		});

		logger.info(`Document processed and saved: ${document.id}`);

		return res.status(201).json({
			message: "Document uploaded and processed successfully",
			document: {
				id: document.id,
				title: document.title,
				fileType: document.fileType,
				fileSize: document.fileSize,
				summary: document.summary,
				entities: document.entities,
				sentiment: document.sentiment,
				language: document.language,

				createdAt: document.createdAt,
			},
		});
	} catch (error) {
		logger.error("Document upload error:", error);
		return res.status(500).json({ error: "Failed to process document" });
	}
};

const batchUploadHandler = async (
	req: AuthenticatedRequest,
	res: express.Response,
): Promise<express.Response> => {
	try {
		if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
			return res.status(400).json({ error: "No files uploaded" });
		}

		const userId = req.user?.id;
		const files = req.files as Express.Multer.File[];

		logger.info(
			`Processing batch upload: ${files.length} files for user: ${userId}`,
		);

		const results = [];
		const errors = [];

		for (const file of files) {
			try {
				const processedDoc = await documentProcessorService.processDocument(
					file.buffer,
					file.originalname,
					file.mimetype,
				);
				const entities = await documentProcessorService.extractEntities(
					processedDoc.content,
				);
				const topics = documentProcessorService.extractTopics(
					processedDoc.content,
				);
				const summary = await documentProcessorService.generateSummary(
					processedDoc.content,
				);
				const sentiment = await documentProcessorService.analyzeSentiment(
					processedDoc.content,
				);

				const metadataJson = JSON.parse(JSON.stringify(processedDoc.metadata));

				const document = await prisma.document.create({
					data: {
						title: processedDoc.title,
						content: processedDoc.content,
						fileType: file.mimetype,
						fileSize: file.size,
						embedding: processedDoc.embedding,
						metadata: metadataJson,
						summary,
						entities,
						topics,
						sentiment,
						language: processedDoc.metadata.language,
						base64Content: file.buffer.toString("base64"),
						userId,
					},
					select: {
						id: true,
						title: true,
						fileType: true,
						fileSize: true,
						summary: true,
						createdAt: true,
					},
				});

				results.push({
					filename: file.originalname,
					document,
					status: "success",
				});
			} catch (error) {
				logger.error(`Error processing file ${file.originalname}:`, error);
				errors.push({
					filename: file.originalname,
					error: "Processing failed",
					status: "error",
				});
			}
		}

		return res.status(201).json({
			message: `Batch upload completed: ${results.length} successful, ${errors.length} failed`,
			results,
			errors,
		});
	} catch (error) {
		logger.error("Batch upload error:", error);
		return res.status(500).json({ error: "Failed to process batch upload" });
	}
};

const getDocumentsHandler = async (
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
		const limit = parseInt(req.query.limit as string, 10) || 10;
		const search = req.query.search as string;
		const fileType = req.query.fileType as string;
		const sortBy = (req.query.sortBy as string) || "createdAt";
		const sortOrder = (req.query.sortOrder as string) || "desc";

		const skip = (page - 1) * limit;

		// Build where clause
		const where: Record<string, unknown> = { userId };

		if (search) {
			where.OR = [
				{ title: { contains: search, mode: "insensitive" } },
				{ content: { contains: search, mode: "insensitive" } },
			];
		}

		if (fileType) {
			where.fileType = { contains: fileType };
		}

		// Get documents with pagination
		const [documents, total] = await Promise.all([
			prisma.document.findMany({
				where,
				select: {
					id: true,
					title: true,
					fileType: true,
					fileSize: true,
					summary: true,
					entities: true,
					sentiment: true,
					language: true,
					createdAt: true,
					updatedAt: true,
				},
				orderBy: { [sortBy]: sortOrder },
				skip,
				take: limit,
			}),
			prisma.document.count({ where }),
		]);

		return res.json({
			documents,
			pagination: {
				page,
				limit,
				total,
				pages: Math.ceil(total / limit),
			},
		});
	} catch (error) {
		logger.error("Error fetching documents:", error);
		return res.status(500).json({ error: "Failed to fetch documents" });
	}
};

const vectorSearchHandler = async (
	req: AuthenticatedRequest,
	res: express.Response,
): Promise<express.Response> => {
	try {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ errors: errors.array() });
		}

		const userId = req.user?.id;
		const query = req.query.query as string;
		const limit = parseInt(req.query.limit as string, 10) || 10;
		const numCandidates =
			parseInt(req.query.numCandidates as string, 10) ||
			Math.max(limit * 2, 50);
		const similarity = (req.query.similarity as string) || "cosine";

		logger.info(`Vector search request: query="${query}", user=${userId}`);

		// Vector search service should be initialized at startup

		// Perform vector search with user filter
		const results = await vectorSearchService.vectorSearch(query, {
			limit,
			numCandidates,
			similarity: similarity as any,
			filter: { userId }, // Only search user's documents
		});

		return res.json({
			query,
			results,
			total: results.length,
			searchType: "vector",
		});
	} catch (error) {
		logger.error("Vector search error:", error);
		return res.status(500).json({
			error: "Vector search failed",
			details: error.message,
		});
	}
};

const hybridSearchHandler = async (
	req: AuthenticatedRequest,
	res: express.Response,
): Promise<express.Response> => {
	try {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ errors: errors.array() });
		}

		const userId = req.user?.id;
		const query = req.query.query as string;
		const limit = parseInt(req.query.limit as string, 10) || 10;
		const numCandidates =
			parseInt(req.query.numCandidates as string, 10) ||
			Math.max(limit * 2, 50);
		const textWeight = parseFloat(req.query.textWeight as string) || 0.3;
		const vectorWeight = parseFloat(req.query.vectorWeight as string) || 0.7;

		logger.info(`Hybrid search request: query="${query}", user=${userId}`);

		// Vector search service should be initialized at startup

		// Perform hybrid search with user filter
		const results = await vectorSearchService.hybridSearch(query, {
			limit,
			numCandidates,
			textWeight,
			vectorWeight,
			filter: { userId }, // Only search user's documents
		});

		return res.json({
			query,
			results,
			total: results.length,
			searchType: "hybrid",
			weights: { textWeight, vectorWeight },
		});
	} catch (error) {
		logger.error("Hybrid search error:", error);
		return res.status(500).json({
			error: "Hybrid search failed",
			details: error.message,
		});
	}
};

const enhancedSearchHandler = async (
	req: AuthenticatedRequest,
	res: express.Response,
): Promise<express.Response> => {
	try {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ errors: errors.array() });
		}

		const userId = req.user?.id;
		const query = req.query.query as string;
		const page = parseInt(req.query.page as string, 10) || 1;
		const limit = parseInt(req.query.limit as string, 10) || 10;
		const fileType = req.query.fileType as string;
		const useVector = req.query.useVector === "true";
		const vectorWeight = parseFloat(req.query.vectorWeight as string) || 0.7;

		logger.info(
			`Enhanced search request: query="${query}", useVector=${useVector}, user=${userId}`,
		);

		if (useVector) {
			// Vector search service should be initialized at startup

			// Use hybrid search for enhanced results
			const vectorResults = await vectorSearchService.hybridSearch(query, {
				limit,
				numCandidates: limit * 3,
				vectorWeight,
				textWeight: 1 - vectorWeight,
				filter: {
					userId,
					...(fileType && { fileType: fileType }),
				},
			});

			return res.json({
				query,
				results: vectorResults,
				total: vectorResults.length,
				page,
				limit,
				searchType: "enhanced_vector",
				vectorWeight,
			});
		} else {
			// Fall back to traditional Prisma search
			const skip = (page - 1) * limit;
			const where: any = { userId };

			if (query) {
				where.OR = [
					{ title: { contains: query, mode: "insensitive" } },
					{ content: { contains: query, mode: "insensitive" } },
				];
			}

			if (fileType) {
				where.fileType = { contains: fileType };
			}

			const [documents, total] = await Promise.all([
				prisma.document.findMany({
					where,
					skip,
					take: limit,
					orderBy: { createdAt: "desc" },
					select: {
						id: true,
						title: true,
						content: true,
						fileType: true,
						fileSize: true,
						createdAt: true,
						updatedAt: true,
					},
				}),
				prisma.document.count({ where }),
			]);

			const results = documents.map((doc) => ({
				id: doc.id,
				title: doc.title,
				content: doc.content,
				score: 1.0, // Default score for traditional search
				metadata: {
					fileType: doc.fileType,
					fileSize: doc.fileSize,
					createdAt: doc.createdAt,
					updatedAt: doc.updatedAt,
				},
			}));

			return res.json({
				query,
				results,
				total,
				page,
				limit,
				totalPages: Math.ceil(total / limit),
				searchType: "traditional",
			});
		}
	} catch (error) {
		logger.error("Enhanced search error:", error);
		return res.status(500).json({
			error: "Enhanced search failed",
			details: error.message,
		});
	}
};

const searchStatsHandler = async (
	req: AuthenticatedRequest,
	res: express.Response,
): Promise<express.Response> => {
	try {
		// Vector search service should be initialized at startup

		const stats = await vectorSearchService.getSearchStats();

		// Get user-specific document counts
		const userId = req.user?.id;
		const userDocuments = await prisma.document.count({
			where: { userId },
		});

		return res.json({
			...stats,
			userDocuments,
			vectorSearchAvailable: true,
		});
	} catch (error) {
		logger.error("Error getting search stats:", error);
		return res.status(500).json({
			error: "Failed to get search statistics",
			vectorSearchAvailable: false,
		});
	}
};

const findSimilarDocumentsHandler = async (
	req: AuthenticatedRequest,
	res: express.Response,
): Promise<express.Response> => {
	try {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ errors: errors.array() });
		}

		const userId = req.user?.id;
		const documentId = req.params.id;
		const limit = parseInt(req.query.limit as string, 10) || 5;
		const numCandidates =
			parseInt(req.query.numCandidates as string, 10) ||
			Math.max(limit * 2, 20);

		// Verify the document belongs to the user
		const document = await prisma.document.findFirst({
			where: { id: documentId, userId },
		});

		if (!document) {
			return res.status(404).json({ error: "Document not found" });
		}

		logger.info(
			`Similar documents request: documentId=${documentId}, user=${userId}`,
		);

		// Vector search service should be initialized at startup

		// Find similar documents
		const results = await vectorSearchService.findSimilar(documentId, {
			limit,
			numCandidates,
		});

		// Filter results to only include user's documents
		const userResults = results.filter(
			(result) => result.metadata?.userId === userId,
		);

		return res.json({
			documentId,
			results: userResults,
			total: userResults.length,
			searchType: "similar",
		});
	} catch (error) {
		logger.error("Similar documents search error:", error);
		return res.status(500).json({
			error: "Similar documents search failed",
			details: error.message,
		});
	}
};

const getDocumentHandler = async (
	req: AuthenticatedRequest,
	res: express.Response,
): Promise<express.Response> => {
	try {
		const userId = req.user?.id;
		const documentId = req.params.id;

		const document = await prisma.document.findFirst({
			where: {
				id: documentId,
				userId,
			},
			include: {},
		});

		if (!document) {
			return res.status(404).json({ error: "Document not found" });
		}

		return res.json({ document });
	} catch (error) {
		logger.error("Error fetching document:", error);
		return res.status(500).json({ error: "Failed to fetch document" });
	}
};

const deleteDocumentHandler = async (
	req: AuthenticatedRequest,
	res: express.Response,
): Promise<express.Response> => {
	try {
		const userId = req.user?.id;
		const documentId = req.params.id;

		const document = await prisma.document.findFirst({
			where: {
				id: documentId,
				userId,
			},
		});

		if (!document) {
			return res.status(404).json({ error: "Document not found" });
		}

		// Delete document and related images
		await prisma.document.delete({
			where: { id: documentId },
		});

		logger.info(`Document deleted: ${documentId} by user: ${userId}`);

		return res.json({ message: "Document deleted successfully" });
	} catch (error) {
		logger.error("Error deleting document:", error);
		return res.status(500).json({ error: "Failed to delete document" });
	}
};

const updateDocumentHandler = async (
	req: AuthenticatedRequest,
	res: express.Response,
): Promise<express.Response> => {
	try {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ errors: errors.array() });
		}

		const userId = req.user?.id;
		const documentId = req.params.id;
		const { title, summary } = req.body;

		const document = await prisma.document.findFirst({
			where: {
				id: documentId,
				userId,
			},
		});

		if (!document) {
			return res.status(404).json({ error: "Document not found" });
		}

		const updateData: Record<string, unknown> = {};
		if (title) updateData.title = title;
		if (summary) updateData.summary = summary;
		updateData.updatedAt = new Date();

		const updatedDocument = await prisma.document.update({
			where: { id: documentId },
			data: updateData,
			select: {
				id: true,
				title: true,
				summary: true,
				updatedAt: true,
			},
		});

		return res.json({
			message: "Document updated successfully",
			document: updatedDocument,
		});
	} catch (error) {
		logger.error("Error updating document:", error);
		return res.status(500).json({ error: "Failed to update document" });
	}
};

const documentController = {
	uploadDocumentHandler,
	batchUploadHandler,
	getDocumentsHandler,
	vectorSearchHandler,
	hybridSearchHandler,
	enhancedSearchHandler,
	searchStatsHandler,
	findSimilarDocumentsHandler,
	getDocumentHandler,
	deleteDocumentHandler,
	updateDocumentHandler,
};

export default documentController;
