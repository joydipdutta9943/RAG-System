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

// Unified enrichment function
const enrichDocumentContent = async (text: string) => {
	try {
		// Run AI tasks in parallel for performance
		const [language, entities, summary, sentiment, category] =
			await Promise.all([
				detectLanguage(text),
				extractEntities(text),
				generateSummary(text),
				analyzeSentiment(text),
				documentCategorizationService.categorizeDocument(
					text,
					"Untitled",
					"unknown",
				),
			]);

		return {
			language,
			entities,
			summary,
			sentiment,
			category: category.primary,
			keywords: extractKeywords(text),
			author: extractAuthor(text),
		};
	} catch (error) {
		logger.warn("Error during document enrichment:", error);
		// Return partial/fallback data
		return {
			language: "unknown",
			entities: [],
			summary: text.substring(0, 200),
			sentiment: 0,
			category: "uncategorized",
			keywords: [],
		};
	}
};

const processPDF = async (
	fileBuffer: Buffer,
	fileSize: number,
	redisClient?: RedisClientType,
): Promise<ProcessedDocument> => {
	try {
		const pdfData = await new PDFParse({ data: fileBuffer }).getText();
		const text = pdfData.text;

		const embedding = await embeddingService.generateTextEmbedding(
			text,
			redisClient,
		);
		const enrichment = await enrichDocumentContent(text);

		return {
			title: "PDF Document",
			content: text,
			fileSize,
			metadata: {
				pageCount: pdfData.total,
				...enrichment,
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
		const enrichment = await enrichDocumentContent(content);

		return {
			title: "Text Document",
			content,
			fileSize,
			metadata: {
				...enrichment,
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

		// Combine description and OCR text for a rich text representation
		const combinedText = `Image Description: ${image.description}\n\nExtracted Text: ${image.ocrText}`;

		// Generate text embedding from the combined text
		const embedding = await embeddingService.generateTextEmbedding(
			combinedText,
			redisClient,
		);

		// Now enrich the image document just like a text document!
		const enrichment = await enrichDocumentContent(combinedText);

		return {
			title: "Image Document",
			content: combinedText,
			fileSize,
			metadata: {
				extractedImages: 1,
				originalOcrText: image.ocrText,
				originalDescription: image.description,
				...enrichment, // Add summary, entities, sentiment, etc.
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
		const metadata = await sharp(imageBuffer).metadata();

		const ocrResult = await Tesseract.recognize(imageBuffer, "eng", {
			logger: (m) => {
				if (m.status === "recognizing text") {
					logger.debug(`OCR Progress: ${Math.round(m.progress * 100)}%`);
				}
			},
		});

		// We still generate a legacy image embedding if needed, but text embedding is primary now
		const embedding = await embeddingService.generateImageEmbedding(
			imageBuffer,
			redisClient,
		);

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
		return await documentCategorizationService.detectDocumentLanguage(text);
	} catch (error) {
		logger.warn("AI language detection unavailable, using fallback:", error);
		const commonEnglishWords = ["the", "and", "or", "but", "in", "on", "at"];
		const words = text.toLowerCase().split(/\s+/).slice(0, 100);
		const englishWordCount = words.filter((word) =>
			commonEnglishWords.includes(word),
		).length;
		return englishWordCount > words.length * 0.1 ? "en" : "unknown";
	}
};

const extractEntities = async (text: string): Promise<string[]> => {
	try {
		const extractedEntities =
			await documentCategorizationService.extractEntities(text);

		const entities: string[] = [
			...(extractedEntities.people || []),
			...(extractedEntities.organizations || []),
			...(extractedEntities.locations || []),
			...(extractedEntities.emails || []),
			...(extractedEntities.phoneNumbers || []),
			...(extractedEntities.urls || []),
		];

		return [...new Set(entities)];
	} catch (error) {
		logger.warn("AI entity extraction unavailable, using fallback:", error);
		const entities: string[] = [];
		const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
		const emails = text.match(emailPattern) || [];
		entities.push(...emails);
		return [...new Set(entities)];
	}
};

const generateSummary = async (
	text: string,
	maxLength: number = 200,
): Promise<string> => {
	try {
		const summary = await summarizationService.generateParagraphSummary(text);
		return summary.length > maxLength
			? `${summary.substring(0, maxLength)}...`
			: summary;
	} catch (error) {
		logger.warn("AI summarization unavailable, using fallback:", error);
		return text.substring(0, maxLength);
	}
};

const analyzeSentiment = async (text: string): Promise<number> => {
	try {
		return await documentCategorizationService.analyzeSentiment(text);
	} catch (error) {
		logger.warn("AI sentiment analysis unavailable, using fallback:", error);
		return 0;
	}
};

const extractAuthor = (text: string): string | undefined => {
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
	const words =
		text
			.toLowerCase()
			.match(/\b\w+\b/g)
			?.filter((word) => word.length > 3) || [];

	const wordFreq: Record<string, number> = {};
	words.forEach((word) => {
		wordFreq[word] = (wordFreq[word] || 0) + 1;
	});

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
