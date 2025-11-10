import type {
	Collection,
	Db,
	MongoClient,
	Document as MongoDocument,
} from "mongodb";
import { logger } from "../config/logger.js";
import type {
	HybridSearchOptions,
	SimilarDocumentResult,
	VectorSearchOptions,
	VectorSearchResult,
} from "../types/searchTypes.js";
import { REDIS_CONFIG, VECTOR_CONFIG } from "../utils/constantUtils.js";
import embeddingService from "./embeddingService.js";

// Service state
let mongoClient: MongoClient;
let db: Db;
let collection: Collection;
let redisClient: any;

// Configuration
const indexName = "vector_search_index";
const vectorPath = "embedding";
const aggregationTimeoutMs = 12000;

const initialize = async (database: Db, redis?: any): Promise<void> => {
	try {
		db = database;
		collection = db.collection("documents");
		redisClient = redis;

		// Ensure vector search index exists
		await ensureVectorIndex();

		logger.info("Vector search service initialized successfully");
	} catch (error) {
		logger.error("Failed to initialize vector search service:", error);
		throw error;
	}
};

const ensureVectorIndex = async (): Promise<void> => {
	try {
		// Check if index already exists
		const indexes = await collection.listSearchIndexes().toArray();
		const existingIndex = (indexes as any[]).find(
			(idx: any) => idx.name === indexName,
		) as any;

		if (existingIndex?.queryable) {
			logger.info(
				`Vector search index '${indexName}' already exists and is queryable`,
			);
			return;
		}

		if (existingIndex && !existingIndex.queryable) {
			logger.info(
				`Vector search index '${indexName}' exists but is not queryable yet`,
			);
			await waitForIndexReady();
			return;
		}

		// Create or update vector search index with filterable fields
		const indexDefinition = {
			name: indexName,
			type: "vectorSearch",
			definition: {
				fields: [
					{
						type: "vector",
						path: vectorPath,
						numDimensions: VECTOR_CONFIG.DEFAULT_DIMENSIONS,
						similarity: "cosine",
					},
					{ type: "filter", path: "userId" },
					{ type: "filter", path: "fileType" },
				],
			},
		};

		if (!existingIndex) {
			logger.info(`Creating vector search index '${indexName}'...`);
			await collection.createSearchIndex(indexDefinition);
		} else {
			try {
				logger.info(
					`Ensuring vector search index '${indexName}' has filter fields (update if needed)...`,
				);
				await (collection as any).updateSearchIndex(indexName, {
					definition: indexDefinition.definition,
				});
			} catch (updateErr) {
				logger.warn(
					"Update of existing vector index skipped/failed:",
					updateErr,
				);
			}
		}

		// Wait for index to be ready
		await waitForIndexReady();
	} catch (error) {
		logger.error("Error creating vector search index:", error);
		throw error;
	}
};

const waitForIndexReady = async (): Promise<void> => {
	logger.info("Waiting for vector search index to be ready...");

	const maxWaitTime = 300000; // 5 minutes
	const pollInterval = 5000; // 5 seconds
	const startTime = Date.now();

	while (Date.now() - startTime < maxWaitTime) {
		try {
			const indexes = await collection.listSearchIndexes().toArray();
			const index = (indexes as any[]).find(
				(idx: any) => idx.name === indexName,
			) as any;

			if (index?.queryable) {
				logger.info(`Vector search index '${indexName}' is ready for querying`);
				return;
			}

			logger.info(`Index status: ${index?.status || "unknown"}, waiting...`);
			await new Promise((resolve) => setTimeout(resolve, pollInterval));
		} catch (error) {
			logger.warn("Error checking index status:", error);
			await new Promise((resolve) => setTimeout(resolve, pollInterval));
		}
	}

	throw new Error(
		`Vector search index did not become ready within ${maxWaitTime}ms`,
	);
};

const vectorSearch = async (
	query: string,
	options: VectorSearchOptions = {},
): Promise<VectorSearchResult[]> => {
	try {
		const { limit = 10, numCandidates = 50, filter } = options;

		// Generate query vector
		const queryVector = await embeddingService.generateTextEmbedding(
			query,
			redisClient,
		);

		// Build Atlas Search filter - only support string filters for now
		const atlasFilter = filter
			? {
					...(filter.userId && { userId: filter.userId }),
					...(filter.fileType && {
						fileType: Array.isArray(filter.fileType)
							? { $in: filter.fileType }
							: filter.fileType,
					}),
				}
			: undefined;

		// Build aggregation pipeline
		const pipeline: MongoDocument[] = [
			{
				$vectorSearch: {
					index: indexName,
					path: vectorPath,
					queryVector: queryVector,
					numCandidates: Math.max(numCandidates, limit * 2),
					limit: limit,
					...(atlasFilter && { filter: atlasFilter }),
				},
			},
			{
				$project: {
					_id: 1,
					title: 1,
					content: 1,
					metadata: 1,
					userId: 1,
					createdAt: 1,
					updatedAt: 1,
					score: { $meta: "vectorSearchScore" },
				},
			},
			{
				$match: {
					score: { $gte: filter.scoreThreshold || 0.7 }, // Set your desired score threshold here
				},
			},
		];

		// Execute search with timeout and fallback
		const startTime = Date.now();
		let results: any[] | null = null;
		try {
			results = await Promise.race<Promise<any[]>>([
				collection
					.aggregate(pipeline, { maxTimeMS: aggregationTimeoutMs })
					.toArray(),
				new Promise<any[]>((_, reject) =>
					setTimeout(
						() => reject(new Error("vectorSearch timeout")),
						aggregationTimeoutMs + 1000,
					),
				),
			]);
		} catch (aggErr) {
			logger.warn(
				"Vector search aggregation failed, using in-app fallback:",
				aggErr,
			);
			results = await fallbackVectorSearch(
				queryVector,
				atlasFilter,
				limit,
				numCandidates,
			);
		}
		const searchTime = Date.now() - startTime;

		// Transform results
		const searchResults: VectorSearchResult[] = results.map((doc) => ({
			id: doc._id.toString(),
			title: doc.title || "Untitled",
			content: doc.content || "",
			score: doc.score || 0,
			metadata: {
				userId:
					typeof doc.userId === "object" && doc.userId?.toString
						? doc.userId.toString()
						: doc.userId,
				createdAt: doc.createdAt,
				updatedAt: doc.updatedAt,
				...(doc.metadata || {}),
			},
		}));

		logger.info(
			`Vector search completed: query="${query}", results=${searchResults.length}, time=${searchTime}ms`,
		);

		// Cache results for a short time
		if (redisClient) {
			try {
				const cacheKey = `vector_search:${Buffer.from(
					query + JSON.stringify(options),
				).toString("base64")}`;
				await redisClient.setEx(
					cacheKey,
					REDIS_CONFIG.SEARCH_CACHE_TTL,
					JSON.stringify(searchResults),
				);
			} catch (redisError) {
				logger.debug(
					"Redis caching not available for search results:",
					redisError,
				);
			}
		}

		return searchResults;
	} catch (error) {
		logger.error("Vector search failed:", error);
		throw new Error(`Vector search failed: ${error.message}`);
	}
};

const hybridSearch = async (
	query: string,
	options: HybridSearchOptions = {},
): Promise<VectorSearchResult[]> => {
	try {
		const {
			limit = 10,
			numCandidates = 50,
			filter,
			textWeight = 0.3,
			vectorWeight = 0.7,
		} = options;

		// Generate query vector
		const queryVector = await embeddingService.generateTextEmbedding(
			query,
			redisClient,
		);

		// Build Atlas Search filter - only support string filters for now
		const atlasFilter = filter
			? {
					...(filter.userId && { userId: filter.userId }),
					...(filter.fileType && {
						fileType: Array.isArray(filter.fileType)
							? { $in: filter.fileType }
							: filter.fileType,
					}),
				}
			: undefined;
		const pipeline: MongoDocument[] = [
			{
				$vectorSearch: {
					index: indexName,
					path: vectorPath,
					queryVector: queryVector,
					numCandidates: Math.max(numCandidates, limit * 3),
					limit: limit * 2, // Get more results for reranking
					...(atlasFilter && { filter: atlasFilter }),
				},
			},
			{
				$addFields: {
					vectorScore: { $meta: "vectorSearchScore" },
					textScore: {
						$divide: [
							{
								$add: [
									{
										$indexOfCP: [{ $toLower: "$title" }, { $toLower: query }],
									},
									{
										$indexOfCP: [{ $toLower: "$content" }, { $toLower: query }],
									},
								],
							},
							100, // Normalize text score
						],
					},
				},
			},
			{
				$addFields: {
					hybridScore: {
						$add: [
							{ $multiply: ["$vectorScore", vectorWeight] },
							{ $multiply: [{ $max: ["$textScore", 0] }, textWeight] },
						],
					},
				},
			},
			{
				$sort: { hybridScore: -1 },
			},
			{
				$limit: limit,
			},
			{
				$project: {
					_id: 1,
					title: 1,
					content: 1,
					metadata: 1,
					userId: 1,
					createdAt: 1,
					updatedAt: 1,
					score: "$hybridScore",
					vectorScore: 1,
					textScore: 1,
				},
			},
		];

		// Execute hybrid search with fallback
		const startTime = Date.now();
		let results: any[] | null = null;
		try {
			results = await Promise.race<Promise<any[]>>([
				collection
					.aggregate(pipeline, { maxTimeMS: aggregationTimeoutMs })
					.toArray(),
				new Promise<any[]>((_, reject) =>
					setTimeout(
						() => reject(new Error("hybridSearch timeout")),
						aggregationTimeoutMs + 1000,
					),
				),
			]);
		} catch (aggErr) {
			logger.warn(
				"Hybrid search aggregation failed, using in-app fallback:",
				aggErr,
			);
			results = await fallbackHybridSearch(
				query,
				queryVector,
				atlasFilter,
				limit,
				textWeight,
				vectorWeight,
				numCandidates,
			);
		}
		const searchTime = Date.now() - startTime;

		// Transform results
		const searchResults: VectorSearchResult[] = results.map((doc) => ({
			id: doc._id.toString(),
			title: doc.title || "Untitled",
			content: doc.content || "",
			score: doc.score || 0,
			metadata: {
				userId:
					typeof doc.userId === "object" && doc.userId?.toString
						? doc.userId.toString()
						: doc.userId,
				createdAt: doc.createdAt,
				updatedAt: doc.updatedAt,
				vectorScore: doc.vectorScore,
				textScore: doc.textScore,
				...(doc.metadata || {}),
			},
		}));

		logger.info(
			`Hybrid search completed: query="${query}", results=${searchResults.length}, time=${searchTime}ms`,
		);

		return searchResults;
	} catch (error) {
		logger.error("Hybrid search failed:", error);
		throw new Error(`Hybrid search failed: ${error.message}`);
	}
};

const findSimilar = async (
	documentId: string,
	options: Omit<VectorSearchOptions, "filter"> = {},
): Promise<SimilarDocumentResult[]> => {
	try {
		const { limit = 10, numCandidates = 50 } = options;

		// Get the document and its embedding
		const document = await collection.findOne({
			_id: documentId,
			embedding: { $exists: true, $ne: null },
		} as any);
		if (!document || !document.embedding) {
			throw new Error("Document not found or has no embedding");
		}

		// Use the document's embedding as query vector
		const pipeline: MongoDocument[] = [
			{
				$vectorSearch: {
					index: indexName,
					path: vectorPath,
					queryVector: document.embedding,
					numCandidates: Math.max(numCandidates, limit + 1),
					limit: limit + 1, // +1 to exclude the original document
					filter: {
						_id: { $ne: documentId as any },
					}, // Exclude the original document
				},
			},
			{
				$project: {
					_id: 1,
					title: 1,
					content: 1,
					metadata: 1,
					userId: 1,
					createdAt: 1,
					updatedAt: 1,
					score: { $meta: "vectorSearchScore" },
				},
			},
			{
				$limit: limit,
			},
		];

		let results: any[] | null = null;
		try {
			results = await Promise.race<Promise<any[]>>([
				collection
					.aggregate(pipeline, { maxTimeMS: aggregationTimeoutMs })
					.toArray(),
				new Promise<any[]>((_, reject) =>
					setTimeout(
						() => reject(new Error("findSimilar timeout")),
						aggregationTimeoutMs + 1000,
					),
				),
			]);
		} catch (aggErr) {
			logger.warn(
				"Similar-doc aggregation failed, using in-app fallback:",
				aggErr,
			);
			results = await fallbackFindSimilar(
				documentId,
				document.embedding,
				limit,
				numCandidates,
			);
		}

		// Transform results
		const searchResults: SimilarDocumentResult[] = results.map((doc) => ({
			id: doc._id.toString(),
			title: doc.title || "Untitled",
			content: doc.content || "",
			score: doc.score || 0,
			metadata: {
				userId: doc.userId,
				createdAt: doc.createdAt,
				updatedAt: doc.updatedAt,
				...(doc.metadata || {}),
			},
		}));

		logger.info(
			`Similar document search completed: documentId="${documentId}", results=${searchResults.length}`,
		);

		return searchResults;
	} catch (error) {
		logger.error("Similar document search failed:", error);
		throw new Error(`Similar document search failed: ${error.message}`);
	}
};

// Fallback methods for when $vectorSearch is unavailable
const fallbackVectorSearch = async (
	queryVector: number[],
	filter: any | undefined,
	limit: number,
	numCandidates: number,
): Promise<any[]> => {
	const mongoFilter: any = { embedding: { $exists: true, $ne: null } };
	if (filter && typeof filter === "object") Object.assign(mongoFilter, filter);
	const candidates = await collection
		.find(mongoFilter, {
			projection: {
				title: 1,
				content: 1,
				metadata: 1,
				userId: 1,
				createdAt: 1,
				updatedAt: 1,
				embedding: 1,
			},
		})
		.limit(Math.max(numCandidates, limit * 5))
		.toArray();
	const scored = (candidates as any[]).map((doc: any) => ({
		...doc,
		score: embeddingService.calculateCosineSimilarity(
			queryVector,
			(doc.embedding || []) as number[],
		),
	}));
	scored.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
	return scored.slice(0, limit);
};

const fallbackHybridSearch = async (
	query: string,
	queryVector: number[],
	filter: any | undefined,
	limit: number,
	textWeight: number,
	vectorWeight: number,
	numCandidates: number,
): Promise<any[]> => {
	const mongoFilter: any = { embedding: { $exists: true, $ne: null } };
	if (filter && typeof filter === "object") Object.assign(mongoFilter, filter);
	const candidates = await collection
		.find(mongoFilter, {
			projection: {
				title: 1,
				content: 1,
				metadata: 1,
				userId: 1,
				createdAt: 1,
				updatedAt: 1,
				embedding: 1,
			},
		})
		.limit(Math.max(numCandidates, limit * 5))
		.toArray();
	const qLower = query.toLowerCase();
	const rescored = (candidates as any[]).map((doc: any) => {
		const vectorScore = embeddingService.calculateCosineSimilarity(
			queryVector,
			(doc.embedding || []) as number[],
		);
		const titleIdx = (doc.title || "").toLowerCase().indexOf(qLower);
		const contentIdx = (doc.content || "").toLowerCase().indexOf(qLower);
		const textScore =
			Math.max(0, (titleIdx >= 0 ? 1 : 0) + (contentIdx >= 0 ? 1 : 0)) / 2;
		return {
			...doc,
			score: vectorScore * vectorWeight + textScore * textWeight,
			vectorScore,
			textScore,
		};
	});
	rescored.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
	return rescored.slice(0, limit);
};

const fallbackFindSimilar = async (
	documentId: string,
	documentEmbedding: number[],
	limit: number,
	numCandidates: number,
): Promise<any[]> => {
	const candidates = await collection
		.find(
			{
				_id: { $ne: documentId as any },
				embedding: { $exists: true, $ne: null },
			},
			{
				projection: {
					title: 1,
					content: 1,
					metadata: 1,
					userId: 1,
					createdAt: 1,
					updatedAt: 1,
					embedding: 1,
				},
			},
		)
		.limit(Math.max(numCandidates, limit * 5))
		.toArray();
	const scored = (candidates as any[]).map((doc: any) => ({
		...doc,
		score: embeddingService.calculateCosineSimilarity(
			documentEmbedding,
			(doc.embedding || []) as number[],
		),
	}));
	scored.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
	return scored.slice(0, limit);
};

const getSearchStats = async (): Promise<{
	totalDocuments: number;
	indexedDocuments: number;
	indexStatus: string;
}> => {
	try {
		const totalDocuments = await collection.countDocuments();
		const indexedDocuments = await collection.countDocuments({
			embedding: { $exists: true, $ne: null },
		});

		const indexes = await collection.listSearchIndexes().toArray();
		const vectorIndex = (indexes as any[]).find(
			(idx: any) => idx.name === indexName,
		) as any;
		const indexStatus = vectorIndex?.status || "not_found";

		return {
			totalDocuments,
			indexedDocuments,
			indexStatus,
		};
	} catch (error) {
		logger.error("Error getting search stats:", error);
		throw error;
	}
};

const close = async (): Promise<void> => {
	try {
		if (mongoClient) {
			await mongoClient.close();
			logger.info("Vector search service connection closed");
		}
	} catch (error) {
		logger.error("Error closing vector search service:", error);
	}
};

const vectorSearchService = {
	initialize,
	vectorSearch,
	hybridSearch,
	findSimilar,
	getSearchStats,
	close,
};

export default vectorSearchService;
