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

// Document processing job - now processes already uploaded documents
documentProcessingQueue.process("process-document", async (job) => {
	const { documentId } = job.data;

	try {
		logger.info(`Processing document job: ${documentId}`);

		// Update progress
		job.progress(10);

		// Get document from database
		const document = await prisma.document.findUnique({
			where: { id: documentId },
		});

		if (!document) {
			throw new Error(`Document not found: ${documentId}`);
		}

		// Extract additional metadata from content
		const entities = await documentProcessorService.extractEntities(
			document.content,
		);
		const summary = await documentProcessorService.generateSummary(
			document.content,
		);
		const sentiment = await documentProcessorService.analyzeSentiment(
			document.content,
		);
		job.progress(50);

		// Update document in database with extracted metadata
		await prisma.document.update({
			where: { id: documentId },
			data: {
				summary,
				entities,
				sentiment,
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
