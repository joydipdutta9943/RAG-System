import { type Db, MongoClient } from "mongodb";
import { logger } from "../config/logger.js";

export interface VectorIndexDefinition {
	name: string;
	type: "vectorSearch";
	definition: {
		fields: Array<
			| {
					type: "vector";
					path: string;
					numDimensions: number;
					similarity: "cosine" | "euclidean" | "dotProduct";
					quantization?: "scalar" | "binary";
			  }
			| {
					type: "filter";
					path: string;
			  }
		>;
	};
}

export interface IndexStatus {
	name: string;
	status: "BUILDING" | "READY" | "FAILED" | "UNKNOWN";
	queryable: boolean;
	definition: any;
}

// Service state
let mongoClient: MongoClient;
let db: Db;

const initialize = (): void => {
	const mongoUri =
		process.env.DATABASE_URL || "mongodb://localhost:27017/enhanced-rag-system";
	mongoClient = new MongoClient(mongoUri);
};

const connect = async (): Promise<void> => {
	try {
		await mongoClient.connect();
		db = mongoClient.db();
		logger.info("Vector index service initialized successfully");
	} catch (error) {
		logger.error("Failed to initialize vector index service:", error);
		throw error;
	}
};

/**
 * Create a vector search index on a collection
 */
const createVectorIndex = async (
	collectionName: string,
	indexDefinition: VectorIndexDefinition,
): Promise<string> => {
	try {
		const collection = db.collection(collectionName);

		logger.info(
			`Creating vector search index '${indexDefinition.name}' on collection '${collectionName}'`,
		);

		const result = await collection.createSearchIndex(indexDefinition);

		logger.info(`Vector search index '${result}' created successfully`);

		return result;
	} catch (error) {
		logger.error(`Failed to create vector index on ${collectionName}:`, error);
		throw new Error(`Failed to create vector index: ${error.message}`);
	}
};

/**
 * List all search indexes on a collection
 */
const listIndexes = async (collectionName: string): Promise<IndexStatus[]> => {
	try {
		const collection = db.collection(collectionName);
		const indexes = await collection.listSearchIndexes().toArray();

		return indexes.map((index: any) => ({
			name: index.name,
			status: index.status || "UNKNOWN",
			queryable: index.queryable || false,
			definition: index.latestDefinition || index.definition,
		}));
	} catch (error) {
		logger.error(`Failed to list indexes for ${collectionName}:`, error);
		throw new Error(`Failed to list indexes: ${error.message}`);
	}
};

/**
 * Get status of a specific vector index
 */
const getIndexStatus = async (
	collectionName: string,
	indexName: string,
): Promise<IndexStatus | null> => {
	try {
		const indexes = await listIndexes(collectionName);
		return indexes.find((index) => index.name === indexName) || null;
	} catch (error) {
		logger.error(`Failed to get index status for ${indexName}:`, error);
		throw error;
	}
};

/**
 * Wait for a vector index to become queryable
 */
const waitForIndexReady = async (
	collectionName: string,
	indexName: string,
	timeoutMs: number = 300000, // 5 minutes default
): Promise<void> => {
	const startTime = Date.now();
	const pollInterval = 5000; // 5 seconds

	logger.info(`Waiting for index '${indexName}' to become ready...`);

	while (Date.now() - startTime < timeoutMs) {
		try {
			const status = await getIndexStatus(collectionName, indexName);

			if (!status) {
				throw new Error(`Index '${indexName}' not found`);
			}

			if (status.queryable) {
				logger.info(`Index '${indexName}' is ready for querying`);
				return;
			}

			logger.info(`Index status: ${status.status}, waiting...`);
			await new Promise((resolve) => setTimeout(resolve, pollInterval));
		} catch (error) {
			if (error.message.includes("not found")) {
				throw error;
			}
			logger.warn("Error checking index status:", error);
			await new Promise((resolve) => setTimeout(resolve, pollInterval));
		}
	}

	throw new Error(
		`Index '${indexName}' did not become ready within ${timeoutMs}ms`,
	);
};

/**
 * Update a vector search index
 */
const updateVectorIndex = async (
	collectionName: string,
	indexName: string,
	newDefinition: VectorIndexDefinition["definition"],
): Promise<void> => {
	try {
		const collection = db.collection(collectionName);

		logger.info(
			`Updating vector search index '${indexName}' on collection '${collectionName}'`,
		);

		await collection.updateSearchIndex(indexName, {
			definition: newDefinition,
		});

		logger.info(`Vector search index '${indexName}' updated successfully`);
	} catch (error) {
		logger.error(`Failed to update vector index ${indexName}:`, error);
		throw new Error(`Failed to update vector index: ${error.message}`);
	}
};

/**
 * Delete a vector search index
 */
const deleteVectorIndex = async (
	collectionName: string,
	indexName: string,
): Promise<void> => {
	try {
		const collection = db.collection(collectionName);

		logger.info(
			`Deleting vector search index '${indexName}' from collection '${collectionName}'`,
		);

		await collection.dropSearchIndex(indexName);

		logger.info(`Vector search index '${indexName}' deleted successfully`);
	} catch (error) {
		logger.error(`Failed to delete vector index ${indexName}:`, error);
		throw new Error(`Failed to delete vector index: ${error.message}`);
	}
};

/**
 * Create the standard document vector index
 */
const createDocumentVectorIndex = async (): Promise<string> => {
	const indexDefinition: VectorIndexDefinition = {
		name: "vector_search_index",
		type: "vectorSearch",
		definition: {
			fields: [
				{
					type: "vector",
					path: "embedding",
					numDimensions: 384, // Based on your embedding service dimensions
					similarity: "cosine",
					quantization: "scalar", // Enable automatic quantization for better performance
				},
				{
					type: "filter",
					path: "userId",
				},
				{
					type: "filter",
					path: "fileType",
				},
			],
		},
	};

	return await createVectorIndex("documents", indexDefinition);
};

/**
 * Setup all required vector indexes for the application
 */
const setupApplicationIndexes = async (): Promise<void> => {
	try {
		logger.info("Setting up application vector indexes...");

		// Check if document index exists
		const documentIndexes = await listIndexes("documents");
		const documentVectorIndex = documentIndexes.find(
			(idx) => idx.name === "vector_search_index",
		);

		if (!documentVectorIndex) {
			logger.info("Creating document vector index...");
			const indexName = await createDocumentVectorIndex();
			await waitForIndexReady("documents", indexName);
		} else if (!documentVectorIndex.queryable) {
			logger.info("Document vector index exists but not ready, waiting...");
			await waitForIndexReady("documents", "vector_search_index");
		} else {
			logger.info("Document vector index already exists and is ready");
		}

		// You can add more indexes here as needed
		// For example, if you want separate indexes for different content types:

		/*
		// Chat messages vector index
		const chatIndexes = await listIndexes('chat_messages');
		const chatVectorIndex = chatIndexes.find(idx => idx.name === 'chat_vector_index');

		if (!chatVectorIndex) {
			const chatIndexDefinition: VectorIndexDefinition = {
				name: 'chat_vector_index',
				type: 'vectorSearch',
				definition: {
					fields: [
							{
								type: 'vector',
								path: 'embedding',
								numDimensions: 384,
								similarity: 'cosine'
							}
						]
					}
			};
			const chatIndexName = await createVectorIndex('chat_messages', chatIndexDefinition);
			await waitForIndexReady('chat_messages', chatIndexName);
		}
		*/

		logger.info("All application vector indexes are ready");
	} catch (error) {
		logger.error("Failed to setup application indexes:", error);
		throw error;
	}
};

/**
 * Get comprehensive index statistics
 */
const getIndexStatistics = async (): Promise<{
	collections: Array<{
		name: string;
		totalDocuments: number;
		indexedDocuments: number;
		indexes: IndexStatus[];
	}>;
}> => {
	try {
		const collections = await db.listCollections().toArray();
		const stats = [];

		for (const collectionInfo of collections) {
			const collection = db.collection(collectionInfo.name);
			const totalDocuments = await collection.countDocuments();
			const indexedDocuments = await collection.countDocuments({
				embedding: { $exists: true, $ne: null },
			});
			const indexes = await listIndexes(collectionInfo.name);

			if (indexes.length > 0) {
				stats.push({
					name: collectionInfo.name,
					totalDocuments,
					indexedDocuments,
					indexes,
				});
			}
		}

		return { collections: stats };
	} catch (error) {
		logger.error("Failed to get index statistics:", error);
		throw error;
	}
};

/**
 * Close the MongoDB connection
 */
const close = async (): Promise<void> => {
	try {
		await mongoClient.close();
		logger.info("Vector index service connection closed");
	} catch (error) {
		logger.error("Error closing vector index service:", error);
	}
};

const vectorIndexService = {
	initialize,
	connect,
	createVectorIndex,
	listIndexes,
	getIndexStatus,
	waitForIndexReady,
	updateVectorIndex,
	deleteVectorIndex,
	createDocumentVectorIndex,
	setupApplicationIndexes,
	getIndexStatistics,
	close,
};

export default vectorIndexService;
