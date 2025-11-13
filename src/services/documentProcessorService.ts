import path from "node:path";
import { PDFParse } from "pdf-parse";
import type { RedisClientType } from "redis";
import sharp from "sharp";
import Tesseract from "tesseract.js";
import { logger } from "../config/logger.js";
import type {
	ProcessedDocument,
	ProcessedImage,
} from "../types/documentTypes.js";
import documentCategorizationService from "./documentCategorizationService.js";
import embeddingService from "./embeddingService.js";
import geminiVisionService from "./geminiVisionService.js";
import summarizationService from "./summarizationService.js";

const processDocument = async (
	fileBuffer: Buffer,
	originalName: string,
	mimeType: string,
	redisClient?: RedisClientType,
): Promise<ProcessedDocument> => {
	try {
		const fileExtension = path.extname(originalName).toLowerCase();
		const fileSize = fileBuffer.length;

		logger.info(`Processing document: ${originalName} (${fileExtension})`);

		switch (fileExtension) {
			case ".pdf":
				return await processPDF(fileBuffer, fileSize, redisClient);
			case ".txt":
				return await processTextFile(fileBuffer, fileSize, redisClient);
			case ".jpg":
			case ".jpeg":
			case ".png":
			case ".gif":
			case ".bmp":
			case ".webp":
				return await processImageFile(fileBuffer, fileSize, redisClient);
			default:
				throw new Error(`Unsupported file type: ${fileExtension}`);
		}
	} catch (error) {
		logger.error(`Error processing document ${originalName}:`, error);
		throw error;
	}
};

const processPDF = async (
	fileBuffer: Buffer,
	fileSize: number,
	redisClient?: RedisClientType,
): Promise<ProcessedDocument> => {
	try {
		// Extract text from PDF
		const pdfData = await new PDFParse({ data: fileBuffer }).getText();

		// Generate text embedding
		const embedding = await embeddingService.generateTextEmbedding(
			pdfData.text,
			redisClient,
		);

		// Detect language with AI
		const language = await detectLanguage(pdfData.text);

		// Extract entities with AI
		const _entities = await extractEntities(pdfData.text);

		// Generate summary with AI
		const _summary = await generateSummary(pdfData.text);

		// Analyze sentiment with AI
		const _sentiment = await analyzeSentiment(pdfData.text);

		return {
			title: "PDF Document",
			content: pdfData.text,
			fileSize,
			metadata: {
				pageCount: pdfData.total,
				language,
				author: extractAuthor(pdfData.text),
				keywords: extractKeywords(pdfData.text),
			},
			images: [],
			embedding,
		};
	} catch (error) {
		logger.error("Error processing PDF:", error);
		throw new Error("Failed to process PDF document");
	}
};

const processTextFile = async (
	fileBuffer: Buffer,
	fileSize: number,
	redisClient?: RedisClientType,
): Promise<ProcessedDocument> => {
	try {
		const content = fileBuffer.toString("utf-8");
		const embedding = await embeddingService.generateTextEmbedding(
			content,
			redisClient,
		);
		const language = await detectLanguage(content);
		const _entities = await extractEntities(content);
		const _summary = await generateSummary(content);
		const _sentiment = await analyzeSentiment(content);

		return {
			title: "Text Document",
			content,
			fileSize,
			metadata: {
				language,
				author: extractAuthor(content),
				keywords: extractKeywords(content),
			},
			images: [],
			embedding,
		};
	} catch (error) {
		logger.error("Error processing text file:", error);
		throw new Error("Failed to process text document");
	}
};

const processImageFile = async (
	fileBuffer: Buffer,
	fileSize: number,
	redisClient?: RedisClientType,
): Promise<ProcessedDocument> => {
	try {
		const image = await processImage(fileBuffer, redisClient);
		const embedding = image.embedding;

		return {
			title: "Image Document",
			content: image.ocrText || "",
			fileSize,
			metadata: {
				extractedImages: 1,
			},
			images: [image],
			embedding,
		};
	} catch (error) {
		logger.error("Error processing image file:", error);
		throw new Error("Failed to process image document");
	}
};

const processImage = async (
	imageBuffer: Buffer,
	redisClient?: RedisClientType,
): Promise<ProcessedImage> => {
	try {
		// Get image metadata
		const metadata = await sharp(imageBuffer).metadata();

		// Perform OCR
		const ocrResult = await Tesseract.recognize(imageBuffer, "eng", {
			logger: (m) => {
				if (m.status === "recognizing text") {
					logger.debug(`OCR Progress: ${Math.round(m.progress * 100)}%`);
				}
			},
		});

		// Generate image embedding
		const embedding = await embeddingService.generateImageEmbedding(
			imageBuffer,
			redisClient,
		);

		// Generate description using AI (placeholder for now)
		const description = await generateImageDescription(imageBuffer);

		return {
			description,
			ocrText: ocrResult.data.text.trim(),
			embedding,
			metadata: {
				width: metadata.width || 0,
				height: metadata.height || 0,
				format: metadata.format || "unknown",
				size: imageBuffer.length,
			},
		};
	} catch (error) {
		logger.error("Error processing image:", error);
		throw new Error("Failed to process image");
	}
};

const generateImageDescription = async (
	imageBuffer: Buffer,
): Promise<string> => {
	try {
		// Use Gemini Vision for AI-powered image description
		const analysis = await geminiVisionService.analyzeImage(imageBuffer);
		return analysis.description || "Image description unavailable";
	} catch (error) {
		logger.warn(
			"Gemini Vision unavailable, using fallback description:",
			error,
		);
		try {
			const metadata = await sharp(imageBuffer).metadata();
			return `Image with dimensions ${metadata.width}x${metadata.height} in ${metadata.format} format`;
		} catch (metadataError) {
			logger.error("Error generating image description:", metadataError);
			return "Image description unavailable";
		}
	}
};

const detectLanguage = async (text: string): Promise<string> => {
	try {
		// Use AI for accurate language detection
		return await documentCategorizationService.detectDocumentLanguage(text);
	} catch (error) {
		logger.warn("AI language detection unavailable, using fallback:", error);
		// Fallback to basic detection
		const commonEnglishWords = [
			"the",
			"and",
			"or",
			"but",
			"in",
			"on",
			"at",
			"to",
			"for",
			"of",
			"with",
			"by",
		];
		const words = text.toLowerCase().split(/\s+/).slice(0, 100);
		const englishWordCount = words.filter((word) =>
			commonEnglishWords.includes(word),
		).length;

		return englishWordCount > words.length * 0.1 ? "en" : "unknown";
	}
};

const extractEntities = async (text: string): Promise<string[]> => {
	try {
		// Use AI for advanced entity extraction
		const extractedEntities =
			await documentCategorizationService.extractEntities(text);

		// Combine all entity types
		const entities: string[] = [
			...(extractedEntities.people || []),
			...(extractedEntities.organizations || []),
			...(extractedEntities.locations || []),
			...(extractedEntities.emails || []),
			...(extractedEntities.phoneNumbers || []),
			...(extractedEntities.urls || []),
		];

		return [...new Set(entities)]; // Remove duplicates
	} catch (error) {
		logger.warn("AI entity extraction unavailable, using fallback:", error);
		// Fallback to regex patterns
		const entities: string[] = [];
		const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
		const phonePattern = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g;
		const urlPattern = /https?:\/\/[^\s]+/g;

		const emails = text.match(emailPattern) || [];
		const phones = text.match(phonePattern) || [];
		const urls = text.match(urlPattern) || [];

		entities.push(...emails, ...phones, ...urls);
		return [...new Set(entities)];
	}
};

const generateSummary = async (
	text: string,
	maxLength: number = 200,
): Promise<string> => {
	try {
		// Use AI for high-quality summarization
		const summary = await summarizationService.generateParagraphSummary(text);

		// Trim to maxLength if needed
		return summary.length > maxLength
			? `${summary.substring(0, maxLength)}...`
			: summary;
	} catch (error) {
		logger.warn("AI summarization unavailable, using fallback:", error);
		// Fallback to simple extractive summarization
		const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 10);

		if (sentences.length <= 3) {
			return text.substring(0, maxLength);
		}

		// Score sentences by word frequency
		const words = text.toLowerCase().match(/\b\w+\b/g) || [];
		const wordFreq: Record<string, number> = {};

		words.forEach((word) => {
			wordFreq[word] = (wordFreq[word] || 0) + 1;
		});

		const sentenceScores = sentences.map((sentence) => {
			const sentenceWords = sentence.toLowerCase().match(/\b\w+\b/g) || [];
			let score = 0;
			sentenceWords.forEach((word) => {
				score += wordFreq[word] || 0;
			});
			return { sentence: sentence.trim(), score };
		});

		// Get top sentences
		sentenceScores.sort((a, b) => b.score - a.score);
		const topSentences = sentenceScores.slice(0, 3).map((s) => s.sentence);

		const summary = `${topSentences.join(". ")}.`;
		return summary.length > maxLength
			? `${summary.substring(0, maxLength)}...`
			: summary;
	}
};

const analyzeSentiment = async (text: string): Promise<number> => {
	try {
		// Use AI for accurate sentiment analysis
		return await documentCategorizationService.analyzeSentiment(text);
	} catch (error) {
		logger.warn("AI sentiment analysis unavailable, using fallback:", error);
		// Fallback to simple keyword-based sentiment analysis
		const positiveWords = [
			"good",
			"great",
			"excellent",
			"amazing",
			"wonderful",
			"fantastic",
			"positive",
			"success",
		];
		const negativeWords = [
			"bad",
			"terrible",
			"awful",
			"horrible",
			"negative",
			"failure",
			"problem",
			"issue",
		];

		const words = text.toLowerCase().match(/\b\w+\b/g) || [];
		let score = 0;

		words.forEach((word) => {
			if (positiveWords.includes(word)) score += 1;
			if (negativeWords.includes(word)) score -= 1;
		});

		return Math.max(-1, Math.min(1, (score / words.length) * 10));
	}
};

const extractAuthor = (text: string): string | undefined => {
	// Simple author extraction (placeholder)
	const authorPatterns = [
		/(?:author|writer|by):\s*([A-Z][a-z]+ [A-Z][a-z]+)/gi,
		/([A-Z][a-z]+ [A-Z][a-z]+)/g,
	];

	for (const pattern of authorPatterns) {
		const match = text.match(pattern);
		if (match?.[1]) {
			return match[1];
		}
	}

	return undefined;
};

const extractKeywords = (text: string): string[] => {
	// Simple keyword extraction (placeholder)
	const words =
		text
			.toLowerCase()
			.match(/\b\w+\b/g)
			?.filter((word) => word.length > 3) || [];

	const wordFreq: Record<string, number> = {};
	words.forEach((word) => {
		wordFreq[word] = (wordFreq[word] || 0) + 1;
	});

	// Get top 10 most frequent words
	return Object.entries(wordFreq)
		.sort(([, a], [, b]) => b - a)
		.slice(0, 10)
		.map(([word]) => word);
};

const documentProcessorService = {
	processDocument,
	processPDF,
	processTextFile,
	processImageFile,
	processImage,
	generateImageDescription,
	detectLanguage,
	extractEntities,
	generateSummary,
	analyzeSentiment,
	extractAuthor,
	extractKeywords,
};

export default documentProcessorService;
