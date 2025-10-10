import Bull from "bull";
import { prisma } from "../config/database.js";
import { logger } from "../config/logger.js";
import { documentProcessorService, embeddingService } from "./index.js";

// Create queues
export const documentProcessingQueue = new Bull("document processing", {
	redis: {
		host: process.env.REDIS_HOST || "localhost",
		port: parseInt(process.env.REDIS_PORT || "6379", 10),
		password: process.env.REDIS_PASSWORD,
	},
});

export const embeddingQueue = new Bull("embedding generation", {
	redis: {
		host: process.env.REDIS_HOST || "localhost",
		port: parseInt(process.env.REDIS_PORT || "6379", 10),
		password: process.env.REDIS_PASSWORD,
	},
});

export const analyticsQueue = new Bull("analytics processing", {
	redis: {
		host: process.env.REDIS_HOST || "localhost",
		port: parseInt(process.env.REDIS_PORT || "6379", 10),
		password: process.env.REDIS_PASSWORD,
	},
});

// Initialize services
// Services are now imported as functional modules from services/index.js

// Document processing job
documentProcessingQueue.process("process-document", async (job) => {
	const { filePath, originalName, documentId } = job.data;

	try {
		logger.info(`Processing document job: ${documentId}`);

		// Update progress
		job.progress(10);

		// Process document
		const processedDoc = await documentProcessorService.processDocument(
			filePath,
			originalName,
			undefined, // redisClient - pass undefined for now
		);
		job.progress(50);

		// Extract additional metadata
		const entities = await documentProcessorService.extractEntities(
			processedDoc.content,
		);
		const summary = await documentProcessorService.generateSummary(
			processedDoc.content,
		);
		const sentiment = await documentProcessorService.analyzeSentiment(
			processedDoc.content,
		);
		job.progress(80);

		// Convert metadata to proper JSON format
		const metadataJson = JSON.parse(JSON.stringify(processedDoc.metadata));

		// Update document in database
		await prisma.document.update({
			where: { id: documentId },
			data: {
				content: processedDoc.content,
				embedding: processedDoc.embedding,
				metadata: metadataJson,
				summary,
				entities,
				sentiment,
				language: processedDoc.metadata.language,
				images: {
					create: processedDoc.images.map((img) => ({
						imagePath: img.imagePath,
						description: img.description,
						ocrText: img.ocrText,
						embedding: img.embedding,
						metadata: JSON.parse(JSON.stringify(img.metadata)),
					})),
				},
			},
		});

		job.progress(100);
		logger.info(`Document processing completed: ${documentId}`);

		return { success: true, documentId };
	} catch (error) {
		logger.error(`Document processing failed: ${documentId}`, error);
		throw error;
	}
});

// Batch embedding generation job
embeddingQueue.process("batch-embedding", async (job) => {
	const { texts, type = "text" } = job.data;

	try {
		logger.info(`Processing batch embeddings: ${texts.length} items`);

		let embeddings: number[][];
		if (type === "text") {
			embeddings = await embeddingService.batchGenerateTextEmbeddings(texts);
		} else {
			// Handle image embeddings if needed
			embeddings = [];
		}

		job.progress(100);
		return { embeddings };
	} catch (error) {
		logger.error("Batch embedding generation failed:", error);
		throw error;
	}
});

// Analytics processing job
analyticsQueue.process("update-metrics", async (job) => {
	const { metricType, value, metadata } = job.data;

	try {
		await prisma.systemMetrics.create({
			data: {
				metricType,
				value,
				metadata,
				timestamp: new Date(),
			},
		});

		return { success: true };
	} catch (error) {
		logger.error("Analytics update failed:", error);
		throw error;
	}
});

// Queue event handlers
documentProcessingQueue.on("completed", (job, _result) => {
	logger.info(`Document processing job completed: ${job.id}`);
});

documentProcessingQueue.on("failed", (job, err) => {
	logger.error(`Document processing job failed: ${job.id}`, err);
});

embeddingQueue.on("completed", (job, _result) => {
	logger.info(`Embedding job completed: ${job.id}`);
});

embeddingQueue.on("failed", (job, err) => {
	logger.error(`Embedding job failed: ${job.id}`, err);
});

// Queue utilities
export const addDocumentProcessingJob = async (data: {
	filePath: string;
	originalName: string;
	documentId: string;
}) => {
	return await documentProcessingQueue.add("process-document", data, {
		attempts: 3,
		backoff: {
			type: "exponential",
			delay: 2000,
		},
	});
};

export const addBatchEmbeddingJob = async (data: {
	texts: string[];
	type?: "text" | "image";
}) => {
	return await embeddingQueue.add("batch-embedding", data, {
		attempts: 2,
		backoff: {
			type: "fixed",
			delay: 5000,
		},
	});
};

export const addAnalyticsJob = async (data: {
	metricType: string;
	value: number;
	metadata?: Record<string, unknown>;
}) => {
	return await analyticsQueue.add("update-metrics", data);
};
