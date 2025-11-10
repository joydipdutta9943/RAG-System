import crypto from "node:crypto";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger } from "../config/logger.js";
import { VECTOR_CONFIG } from "../utils/constantUtils.js";

// Initialize Google Generative AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || "");
// Use text-embedding-004 which produces 768-dimensional embeddings by default
// This matches our VECTOR_CONFIG.DEFAULT_DIMENSIONS setting
const embeddingModel = genAI.getGenerativeModel({
	model: "text-embedding-004",
});

const generateTextEmbedding = async (
	text: string,
	redisClient?: any,
): Promise<number[]> => {
	try {
		// Check cache first (if Redis is available)
		if (redisClient) {
			try {
				const cacheKey = `embedding:text:${Buffer.from(text).toString("base64")}`;
				const cached = await redisClient.get(cacheKey);

				if (cached) {
					logger.info("Retrieved text embedding from cache");
					return JSON.parse(cached);
				}
			} catch (redisError) {
				logger.debug(
					"Redis cache not available for text embedding:",
					redisError,
				);
			}
		}

		// Generate embedding using Google's API
		const result = await embeddingModel.embedContent(text);
		const embedding = result.embedding.values;

		logger.info(
			`Generated Google text embedding with ${embedding.length} dimensions`,
		);

		// Cache for 24 hours (if Redis is available)
		if (redisClient) {
			try {
				const cacheKey = `embedding:text:${Buffer.from(text).toString("base64")}`;
				await redisClient.setEx(cacheKey, 86400, JSON.stringify(embedding));
			} catch (redisError) {
				logger.debug(
					"Redis caching not available for text embedding:",
					redisError,
				);
			}
		}

		return embedding;
	} catch (error) {
		logger.error("Error generating text embedding:", error);
		// Fallback to simple embedding
		logger.warn("Using fallback embedding due to error:", error);
		return generateSimpleEmbedding(text);
	}
};

const generateSimpleEmbedding = (text: string): number[] => {
	// Generate a simple 384-dimensional embedding based on text characteristics
	const embedding = new Array(VECTOR_CONFIG.DEFAULT_DIMENSIONS).fill(0);

	// Use text characteristics to generate pseudo-embedding
	for (
		let i = 0;
		i < text.length && i < VECTOR_CONFIG.DEFAULT_DIMENSIONS;
		i++
	) {
		const charCode = text.charCodeAt(i % text.length);
		embedding[i] = Math.sin(charCode * (i + 1)) * 0.1;
	}

	// Add some word-based features
	const words = text.toLowerCase().split(/\s+/);
	for (let i = 0; i < words.length && i < 100; i++) {
		const word = words[i];
		const hash = simpleHash(word);
		const index = hash % VECTOR_CONFIG.DEFAULT_DIMENSIONS;
		embedding[index] += 0.05;
	}

	// Normalize the embedding
	const magnitude = Math.sqrt(
		embedding.reduce((sum, val) => sum + val * val, 0),
	);
	return embedding.map((val) => (magnitude > 0 ? val / magnitude : 0));
};

const simpleHash = (str: string): number => {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash; // Convert to 32-bit integer
	}
	return Math.abs(hash);
};

const generateImageEmbedding = async (
	imageBuffer: Buffer,
	redisClient?: any,
): Promise<number[]> => {
	try {
		// Check cache first (if Redis is available)
		if (redisClient) {
			try {
				const hash = crypto
					.createHash("sha256")
					.update(imageBuffer)
					.digest("hex");
				const cacheKey = `embedding:image:${hash}`;
				const cached = await redisClient.get(cacheKey);

				if (cached) {
					logger.info("Retrieved image embedding from cache");
					return JSON.parse(cached);
				}
			} catch (redisError) {
				logger.debug(
					"Redis cache not available for image embedding:",
					redisError,
				);
			}
		}

		// For now, return a simple embedding based on image characteristics
		const embedding = generateSimpleImageEmbedding(imageBuffer);

		// Cache for 24 hours (if Redis is available)
		if (redisClient) {
			try {
				const hash = crypto
					.createHash("sha256")
					.update(imageBuffer)
					.digest("hex");
				const cacheKey = `embedding:image:${hash}`;
				await redisClient.setEx(cacheKey, 86400, JSON.stringify(embedding));
			} catch (redisError) {
				logger.debug(
					"Redis caching not available for image embedding:",
					redisError,
				);
			}
		}

		logger.info(
			`Generated image embedding with ${embedding.length} dimensions`,
		);
		return embedding;
	} catch (error) {
		logger.error("Error generating image embedding:", error);
		throw new Error("Failed to generate image embedding");
	}
};

const generateSimpleImageEmbedding = (imageBuffer: Buffer): number[] => {
	// Generate a simple embedding based on image buffer characteristics
	// Using VECTOR_CONFIG.DEFAULT_DIMENSIONS to match text embeddings
	const dimensions = VECTOR_CONFIG.DEFAULT_DIMENSIONS;
	const embedding = new Array(dimensions).fill(0);

	// Use buffer characteristics to generate pseudo-embedding
	for (let i = 0; i < imageBuffer.length && i < dimensions; i++) {
		const byte = imageBuffer[i % imageBuffer.length];
		embedding[i] = Math.sin(byte * (i + 1)) * 0.1;
	}

	// Add some statistical features
	const bytes = Array.from(imageBuffer);
	const avg = bytes.reduce((a, b) => a + b, 0) / bytes.length;
	const variance = bytes.reduce((a, b) => a + (b - avg) ** 2, 0) / bytes.length;

	// Add these features to the embedding
	for (let i = 0; i < 100; i++) {
		const index = (i * 5) % dimensions;
		embedding[index] += (avg / 255) * 0.1;
		embedding[index + 1] += (variance / 65025) * 0.1;
	}

	// Normalize the embedding
	const magnitude = Math.sqrt(
		embedding.reduce((sum, val) => sum + val * val, 0),
	);
	return embedding.map((val) => (magnitude > 0 ? val / magnitude : 0));
};

const batchGenerateTextEmbeddings = async (
	texts: string[],
	redisClient?: any,
): Promise<number[][]> => {
	try {
		const embeddings = await Promise.all(
			texts.map((text) => generateTextEmbedding(text, redisClient)),
		);

		logger.info(`Generated ${embeddings.length} text embeddings in batch`);
		return embeddings;
	} catch (error) {
		logger.error("Error in batch text embedding generation:", error);
		throw new Error("Failed to generate batch text embeddings");
	}
};

const calculateCosineSimilarity = (a: number[], b: number[]): number => {
	if (a.length !== b.length) {
		throw new Error("Vectors must have the same length");
	}

	let dotProduct = 0;
	let normA = 0;
	let normB = 0;

	for (let i = 0; i < a.length; i++) {
		dotProduct += (a[i] || 0) * (b[i] || 0);
		normA += (a[i] || 0) * (a[i] || 0);
		normB += (b[i] || 0) * (b[i] || 0);
	}

	return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

const embeddingService = {
	generateTextEmbedding,
	generateImageEmbedding,
	batchGenerateTextEmbeddings,
	calculateCosineSimilarity,
};

export default embeddingService;
