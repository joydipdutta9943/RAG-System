import {
	HumanMessage,
} from "@langchain/core/messages";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { logger } from "../config/logger.js";
import { geminiVisionService, vectorSearchService } from "./index.js";

// Define Agent Tools
const TOOLS = {
	VECTOR_SEARCH: "vector_search",
	VISION_ANALYSIS: "vision_analysis",
	DIAGRAM_TO_CODE: "diagram_to_code",
	GENERAL_KNOWLEDGE: "general_knowledge",
};

interface AgentResponse {
	content: string;
	toolsUsed: string[];
	sessionId?: string;
}

// Service state
let geminiModel: ChatGoogleGenerativeAI;

const initialize = (): void => {
	try {
		const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";

		// Initialize LangChain ChatGoogleGenerativeAI model
		geminiModel = new ChatGoogleGenerativeAI({
			model: modelName,
			apiKey: process.env.GOOGLE_AI_API_KEY || "",
			maxOutputTokens: 2048,
			temperature: 0.7,
		});

		logger.info("LangChain AI Agent initialized successfully");
	} catch (error) {
		logger.error("Failed to initialize LangChain AI Agent:", error);
		throw error;
	}
};

const processAgentMessage = async (
	userId: string,
	message: string,
	sessionId?: string,
	file?: Express.Multer.File,
): Promise<AgentResponse> => {
	try {
		const toolsUsed: string[] = [];
		let finalResponse = "";

		// 1. Determine Intent & Context
		// If file is present, prioritize vision tools
		if (file) {
			logger.info(`Agent processing file upload: ${file.mimetype}`);

			if (file.mimetype.startsWith("image/")) {
				toolsUsed.push(TOOLS.VISION_ANALYSIS);

				// Check if user wants code/diagram conversion
				if (
					message.toLowerCase().includes("mermaid") ||
					message.toLowerCase().includes("code") ||
					message.toLowerCase().includes("diagram")
				) {
					toolsUsed.push(TOOLS.DIAGRAM_TO_CODE);

					try {
						const mermaidCode =
							await geminiVisionService.convertDiagramToMermaid(file.buffer);
						finalResponse = `Here is the Mermaid.js code for your diagram:\n\n\`\`\`mermaid\n${mermaidCode}\n\`\`\`\n\nYou can visualize this using the Mermaid Live Editor.`;
					} catch (error) {
						logger.error("Failed to convert diagram:", error);
						finalResponse =
							"I tried to convert the diagram to code, but encountered an error. I'll analyze it as a standard image instead.\n\n";
						const analysis = await geminiVisionService.analyzeImage(
							file.buffer,
						);
						finalResponse += `Analysis: ${analysis.description}`;
					}
				} else {
					// Standard visual Q&A
					const answer = await geminiVisionService.answerVisualQuestion(
						file.buffer,
						message,
					);
					finalResponse = answer.answer;
				}
			} else {
				// Handle other file types (PDFs etc) - Future Scope
				finalResponse =
					"I can currently only process image files directly in chat.";
			}
		} else {
			// 2. Text-only flow: Decide between Search vs General Chat
			// Simple heuristic for now: if query looks like a lookup, use RAG
			const isSearchQuery =
				message.length > 10 &&
				(message.includes("what is") ||
					message.includes("how to") ||
					message.includes("find") ||
					message.includes("search") ||
					message.includes("summarize"));

			if (isSearchQuery) {
				toolsUsed.push(TOOLS.VECTOR_SEARCH);
				logger.info("Agent deciding to use Vector Search");

				const searchResults = await vectorSearchService.vectorSearch(message, {
					limit: 3,
					filter: { userId },
				});

				if (searchResults.length > 0) {
					const context = searchResults
						.map((doc) => `Title: ${doc.title}\nContent: ${doc.content}`)
						.join("\n\n---\n\n");

					const prompt = `You are a helpful assistant. Answer the user's question based on the following context:\n\n${context}\n\nQuestion: ${message}`;
					const result = await geminiModel.invoke([new HumanMessage(prompt)]);
					finalResponse = result.content as string;
				} else {
					// Fallback to general knowledge if no docs found
					toolsUsed.push(TOOLS.GENERAL_KNOWLEDGE);
					const result = await geminiModel.invoke([new HumanMessage(message)]);
					finalResponse = result.content as string;
				}
			} else {
				// General chat
				toolsUsed.push(TOOLS.GENERAL_KNOWLEDGE);
				const result = await geminiModel.invoke([new HumanMessage(message)]);
				finalResponse = result.content as string;
			}
		}

		return {
			content: finalResponse,
			toolsUsed,
			sessionId: sessionId || `session_${Date.now()}`,
		};
	} catch (error) {
		logger.error("Agent processing error:", error);
		throw error;
	}
};

const aiAgentLangchainService = {
	initialize,
	processAgentMessage
};

export default aiAgentLangchainService;
