import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { redis } from "../config/database.js";
import { logger } from "../config/logger.js";

interface QueryComplexity {
	isComplex: boolean;
	factors: string[];
	score: number;
}

interface AIResponse {
	response: string;
	model: string;
	processingTime: number;
	confidence?: number;
}

interface RequestCounts {
	gemini15: number;
	gemini25: number;
	geminiPro: number;
}

// Service state
let gemini15Model: ChatGoogleGenerativeAI;
let geminiProModel: ChatGoogleGenerativeAI;
let dailyRequestCount: RequestCounts = {
	gemini15: 0,
	gemini25: 0,
	geminiPro: 0,
};

const initialize = (): void => {
	try {
		// Initialize LangChain ChatGoogleGenerativeAI models
		gemini15Model = new ChatGoogleGenerativeAI({
			model: "gemini-2.0-flash-001", // Updated to use available model
			apiKey: process.env.GOOGLE_AI_API_KEY || "",
			maxOutputTokens: 1024,
			temperature: 0.7,
		});

		geminiProModel = new ChatGoogleGenerativeAI({
			model: "gemini-2.5-flash", // Updated to use available stable model
			apiKey: process.env.GOOGLE_AI_API_KEY || "",
			maxOutputTokens: 2048,
			temperature: 0.7,
		});

		initializeDailyCounters();
		logger.info("LangChain AI Agent initialized successfully");
	} catch (error) {
		logger.error("Failed to initialize LangChain AI Agent:", error);
		throw error;
	}
};

const initializeDailyCounters = async (): Promise<void> => {
	try {
		const today = new Date().toISOString().split("T")[0];
		const gemini15Count = (await redis.get(`gemini15:${today}`)) || "0";
		const gemini25Count = (await redis.get(`gemini25:${today}`)) || "0";
		const geminiProCount = (await redis.get(`geminiPro:${today}`)) || "0";

		dailyRequestCount = {
			gemini15: parseInt(gemini15Count, 10),
			gemini25: parseInt(gemini25Count, 10),
			geminiPro: parseInt(geminiProCount, 10),
		};
	} catch (_error) {
		// If Redis is not ready, initialize with defaults
		dailyRequestCount = {
			gemini15: 0,
			gemini25: 0,
			geminiPro: 0,
		};
	}
};

const incrementUsageCounter = async (
	modelType: keyof RequestCounts,
): Promise<void> => {
	try {
		const today = new Date().toISOString().split("T")[0];
		const key = `${modelType}:${today}`;
		await redis.incr(key);
		await redis.expire(key, 86400); // Expire after 24 hours
		dailyRequestCount[modelType]++;
	} catch (error) {
		logger.debug("Failed to increment usage counter:", error);
	}
};

const getRemainingQuota = (): RequestCounts => {
	const GEMINI_15_DAILY_LIMIT = 1500;
	const GEMINI_25_DAILY_LIMIT = 100;
	const GEMINI_PRO_DAILY_LIMIT = 100;

	return {
		gemini15: Math.max(0, GEMINI_15_DAILY_LIMIT - dailyRequestCount.gemini15),
		gemini25: Math.max(0, GEMINI_25_DAILY_LIMIT - dailyRequestCount.gemini25),
		geminiPro: Math.max(
			0,
			GEMINI_PRO_DAILY_LIMIT - dailyRequestCount.geminiPro,
		),
	};
};

const assessQueryComplexity = (query: string): QueryComplexity => {
	const complexityFactors: string[] = [];
	let score = 0;

	// Length complexity
	if (query.length > 200) {
		complexityFactors.push("Long query");
		score += 20;
	}
	if (query.length > 500) {
		complexityFactors.push("Very long query");
		score += 30;
	}

	// Question complexity
	const questionWords = [
		"why",
		"how",
		"what",
		"explain",
		"analyze",
		"compare",
		"evaluate",
		"synthesize",
	];
	const hasComplexQuestions = questionWords.some((word) =>
		query.toLowerCase().includes(word),
	);
	if (hasComplexQuestions) {
		complexityFactors.push("Complex question");
		score += 25;
	}

	// Multiple concepts
	const conceptWords = [
		"and",
		"or",
		"but",
		"however",
		"therefore",
		"because",
		"although",
	];
	const conceptCount = conceptWords.filter((word) =>
		query.toLowerCase().includes(word),
	).length;
	if (conceptCount > 2) {
		complexityFactors.push("Multiple concepts");
		score += 20;
	}

	// Technical terms
	const technicalWords = [
		"algorithm",
		"API",
		"database",
		"framework",
		"architecture",
		"implementation",
	];
	const technicalCount = technicalWords.filter((word) =>
		query.toLowerCase().includes(word),
	).length;
	if (technicalCount > 0) {
		complexityFactors.push("Technical content");
		score += 15 * technicalCount;
	}

	return {
		isComplex: score > 40,
		factors: complexityFactors,
		score,
	};
};

const generateContextualPrompt = (query: string, context: string[]): string => {
	const contextStr = context.join("\n\n---\n\n");
	return `You are an AI assistant helping a user find information from their documents.
Based on the provided context, answer the user's question accurately and concisively.

CONTEXT:
${contextStr}

USER QUESTION: ${query}

INSTRUCTIONS:
1. Answer based only on the provided context
2. If the context doesn't contain enough information, say so politely
3. Be concise but comprehensive
4. Cite specific sources when possible
5. If multiple documents are relevant, synthesize the information

ANSWER:`;
};

const processQuery = async (
	query: string,
	context: string[],
): Promise<AIResponse> => {
	const startTime = Date.now();
	const complexity = assessQueryComplexity(query);
	const quota = getRemainingQuota();

	try {
		// Choose model based on complexity and quota
		let selectedModel: ChatGoogleGenerativeAI;
		let modelName: string;

		if (complexity.isComplex && quota.geminiPro > 0) {
			selectedModel = geminiProModel;
			modelName = "gemini-2.5-flash";
		} else if (quota.gemini15 > 0) {
			selectedModel = gemini15Model;
			modelName = "gemini-2.0-flash-001";
		} else {
			throw new Error("No available quota for any Gemini model");
		}

		logger.info(`Query complexity assessment:`, complexity);
		logger.info(`Using model: ${modelName}`);

		// Create prompt template
		const promptTemplate = PromptTemplate.fromTemplate(
			"You are a helpful AI assistant. Based on the provided context, answer the user's question accurately.\n\nContext:\n{context}\n\nQuestion: {question}\n\nAnswer:",
		);

		// Create chain
		const chain = promptTemplate
			.pipe(selectedModel)
			.pipe(new StringOutputParser());

		// Generate response
		const contextStr = context.join("\n\n---\n\n");
		const response = await chain.invoke({
			context: contextStr,
			question: query,
		});

		const processingTime = Date.now() - startTime;

		// Increment usage counter
		if (modelName === "gemini-2.0-flash-001") {
			await incrementUsageCounter("gemini15");
		} else if (modelName === "gemini-2.5-flash") {
			await incrementUsageCounter("geminiPro");
		}

		// Calculate confidence based on response quality
		const confidence = calculateConfidence(response, context, query);

		logger.info(`Query processed successfully in ${processingTime}ms`);

		return {
			response: response.trim(),
			model: modelName,
			processingTime,
			confidence,
		};
	} catch (error) {
		const processingTime = Date.now() - startTime;
		logger.error("Error processing query with LangChain:", error);

		// Return fallback response
		return {
			response:
				"I apologize, but I'm currently unable to process your query due to technical difficulties. Please try again later.",
			model: "fallback",
			processingTime,
			confidence: 0,
		};
	}
};

const processImageQuery = async (
	query: string,
	imageContext: string[],
	textContext: string[],
): Promise<AIResponse> => {
	const startTime = Date.now();
	const combinedContext = [...imageContext, ...textContext];

	try {
		// For now, use the same text-based processing
		// In the future, we can enhance this with multimodal capabilities
		return await processQuery(query, combinedContext);
	} catch (error) {
		const processingTime = Date.now() - startTime;
		logger.error("Error processing image query with LangChain:", error);

		return {
			response:
				"I apologize, but I'm currently unable to process your image query due to technical difficulties. Please try again later.",
			model: "fallback",
			processingTime,
			confidence: 0,
		};
	}
};

const calculateConfidence = (
	response: string,
	context: string[],
	query: string,
): number => {
	// Simple confidence calculation based on response characteristics
	let confidence = 0.5; // Base confidence

	// Higher confidence if response is substantial
	if (response.length > 100) confidence += 0.2;
	if (response.length > 300) confidence += 0.1;

	// Higher confidence if response contains context keywords
	const contextWords = context.join(" ").toLowerCase().split(/\s+/);
	const responseWords = response.toLowerCase().split(/\s+/);
	const queryWords = query.toLowerCase().split(/\s+/);

	const overlappingContextWords = responseWords.filter((word) =>
		contextWords.includes(word),
	);
	const overlappingQueryWords = responseWords.filter((word) =>
		queryWords.includes(word),
	);

	confidence += Math.min(0.3, overlappingContextWords.length * 0.05);
	confidence += Math.min(0.2, overlappingQueryWords.length * 0.1);

	// Lower confidence for hedging language
	const hedgeWords = [
		"might",
		"could",
		"perhaps",
		"maybe",
		"possibly",
		"unclear",
	];
	const hedgeCount = hedgeWords.filter((word) =>
		response.toLowerCase().includes(word),
	).length;
	confidence -= hedgeCount * 0.1;

	return Math.max(0, Math.min(1, confidence));
};

const aiAgentLangchainService = {
	initialize,
	processQuery,
	processImageQuery,
	getRemainingQuota,
	assessQueryComplexity,
};

export default aiAgentLangchainService;
