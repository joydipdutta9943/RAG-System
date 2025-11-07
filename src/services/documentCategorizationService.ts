import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger } from "../config/logger.js";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || "");
const model = genAI.getGenerativeModel({
	model: "gemini-2.0-flash-exp",
	generationConfig: {
		temperature: 0.3, // Lower temperature for more consistent categorization
	},
});

interface DocumentCategory {
	primary: string;
	secondary: string[];
	confidence: number;
}

interface ExtractedEntity {
	text: string;
	type: string;
	confidence: number;
}

interface EntityExtractionResult {
	entities: ExtractedEntity[];
	people: string[];
	organizations: string[];
	locations: string[];
	dates: string[];
	emails: string[];
	phoneNumbers: string[];
	urls: string[];
}

interface KeyPoint {
	point: string;
	importance: number;
}

interface KeyPointsResult {
	keyPoints: string[];
	mainTopics: string[];
	actionItems: string[];
}

const categorizeDocument = async (
	content: string,
	title: string,
	fileType: string,
): Promise<DocumentCategory> => {
	try {
		const prompt = `Analyze this document and categorize it accurately.

Title: ${title}
File Type: ${fileType}
Content Preview: ${content.substring(0, 1000)}

Available categories:
- Invoice
- Resume/CV
- Report
- Contract/Agreement
- Email
- Article/Blog
- Presentation
- Spreadsheet
- Form
- Receipt
- Research Paper
- Technical Documentation
- Meeting Notes
- Marketing Material
- Financial Statement
- Legal Document
- Educational Material
- Product Documentation
- Manual/Guide
- Other

Provide:
1. Primary category (most fitting)
2. Secondary categories (up to 3 related categories)
3. Confidence score (0-100)

Respond in JSON format:
{
  "primary": "category name",
  "secondary": ["category1", "category2"],
  "confidence": 95
}`;

		const result = await model.generateContent(prompt);
		const response = result.response.text();

		// Parse JSON response
		const jsonMatch = response.match(/\{[\s\S]*\}/);
		if (jsonMatch) {
			const category = JSON.parse(jsonMatch[0]);
			logger.info(`Document categorized as: ${category.primary}`);
			return category;
		}

		// Fallback
		return {
			primary: "Other",
			secondary: [],
			confidence: 50,
		};
	} catch (error) {
		logger.error("Error categorizing document:", error);
		return {
			primary: "Other",
			secondary: [],
			confidence: 0,
		};
	}
};

const extractEntities = async (content: string): Promise<EntityExtractionResult> => {
	try {
		const prompt = `Extract all important entities from this text:

${content.substring(0, 3000)}

Extract:
1. People names
2. Organization names
3. Locations (cities, countries, addresses)
4. Dates (in any format)
5. Email addresses
6. Phone numbers
7. URLs/websites
8. Other important entities with their types

Respond in JSON format:
{
  "entities": [
    {"text": "John Doe", "type": "person", "confidence": 95},
    {"text": "Acme Corp", "type": "organization", "confidence": 90}
  ],
  "people": ["John Doe", "Jane Smith"],
  "organizations": ["Acme Corp", "TechCo"],
  "locations": ["New York", "San Francisco"],
  "dates": ["2024-01-15", "March 2024"],
  "emails": ["john@example.com"],
  "phoneNumbers": ["+1-555-1234"],
  "urls": ["https://example.com"]
}`;

		const result = await model.generateContent(prompt);
		const response = result.response.text();

		// Parse JSON response
		const jsonMatch = response.match(/\{[\s\S]*\}/);
		if (jsonMatch) {
			const entities = JSON.parse(jsonMatch[0]);
			logger.info(`Extracted ${entities.entities?.length || 0} entities`);
			return entities;
		}

		// Fallback with regex patterns
		return extractEntitiesWithRegex(content);
	} catch (error) {
		logger.error("Error extracting entities:", error);
		return extractEntitiesWithRegex(content);
	}
};

const extractKeyPoints = async (
	content: string,
	maxPoints: number = 10,
): Promise<KeyPointsResult> => {
	try {
		const prompt = `Extract the key points from this document:

${content}

Provide:
1. ${maxPoints} most important key points (bullet points)
2. Main topics covered
3. Action items (if any)

Be concise and focus on the most critical information.

Respond in JSON format:
{
  "keyPoints": [
    "First important point",
    "Second important point"
  ],
  "mainTopics": ["topic1", "topic2"],
  "actionItems": ["action1", "action2"]
}`;

		const result = await model.generateContent(prompt);
		const response = result.response.text();

		// Parse JSON response
		const jsonMatch = response.match(/\{[\s\S]*\}/);
		if (jsonMatch) {
			const keyPointsData = JSON.parse(jsonMatch[0]);
			logger.info(`Extracted ${keyPointsData.keyPoints?.length || 0} key points`);
			return keyPointsData;
		}

		// Fallback
		return {
			keyPoints: extractBulletPoints(content, maxPoints),
			mainTopics: [],
			actionItems: [],
		};
	} catch (error) {
		logger.error("Error extracting key points:", error);
		return {
			keyPoints: extractBulletPoints(content, maxPoints),
			mainTopics: [],
			actionItems: [],
		};
	}
};

const calculateReadabilityScore = (content: string): number => {
	// Flesch Reading Ease Score
	const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 0);
	const words = content.split(/\s+/).filter((w) => w.length > 0);
	const syllables = words.reduce((count, word) => count + countSyllables(word), 0);

	if (sentences.length === 0 || words.length === 0) return 0;

	const avgWordsPerSentence = words.length / sentences.length;
	const avgSyllablesPerWord = syllables / words.length;

	const score =
		206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord;

	// Normalize to 0-100
	return Math.max(0, Math.min(100, score));
};

const assessDocumentQuality = async (
	content: string,
	title: string,
): Promise<number> => {
	try {
		const prompt = `Assess the quality of this document on a scale of 0-100.

Title: ${title}
Content: ${content.substring(0, 1500)}

Consider:
1. Clarity and coherence
2. Grammar and spelling
3. Structure and organization
4. Completeness
5. Professionalism

Respond with just a number (0-100) and brief explanation:
{
  "score": 85,
  "reasoning": "Well-structured and clear content with minor issues"
}`;

		const result = await model.generateContent(prompt);
		const response = result.response.text();

		// Parse JSON response
		const jsonMatch = response.match(/\{[\s\S]*\}/);
		if (jsonMatch) {
			const assessment = JSON.parse(jsonMatch[0]);
			return assessment.score || 50;
		}

		// Fallback: Basic quality metrics
		return calculateBasicQuality(content);
	} catch (error) {
		logger.error("Error assessing document quality:", error);
		return calculateBasicQuality(content);
	}
};

const detectDocumentLanguage = async (content: string): Promise<string> => {
	try {
		const prompt = `Detect the language of this text. Respond with just the language code (e.g., "en", "es", "fr", "de", etc.).

Text: ${content.substring(0, 500)}`;

		const result = await model.generateContent(prompt);
		const language = result.response.text().trim().toLowerCase();

		// Extract language code if response is verbose
		const langCodeMatch = language.match(/\b([a-z]{2})\b/);
		return langCodeMatch ? langCodeMatch[1] : "en";
	} catch (error) {
		logger.error("Error detecting language:", error);
		return "en";
	}
};

const analyzeSentiment = async (content: string): Promise<number> => {
	try {
		const prompt = `Analyze the sentiment of this text and provide a score from -1 (very negative) to +1 (very positive), with 0 being neutral.

Text: ${content.substring(0, 1000)}

Respond with just a number between -1 and 1.`;

		const result = await model.generateContent(prompt);
		const response = result.response.text().trim();

		// Extract number from response
		const scoreMatch = response.match(/-?\d+\.?\d*/);
		if (scoreMatch) {
			const score = parseFloat(scoreMatch[0]);
			return Math.max(-1, Math.min(1, score));
		}

		return 0;
	} catch (error) {
		logger.error("Error analyzing sentiment:", error);
		return 0;
	}
};

// Helper functions
const extractEntitiesWithRegex = (content: string): EntityExtractionResult => {
	const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
	const phoneRegex =
		/(\+\d{1,3}[\s-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g;
	const urlRegex = /https?:\/\/[^\s]+/g;
	const dateRegex =
		/\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b|\b\d{4}[/-]\d{1,2}[/-]\d{1,2}\b/g;

	return {
		entities: [],
		people: [],
		organizations: [],
		locations: [],
		dates: content.match(dateRegex) || [],
		emails: content.match(emailRegex) || [],
		phoneNumbers: content.match(phoneRegex) || [],
		urls: content.match(urlRegex) || [],
	};
};

const extractBulletPoints = (content: string, maxPoints: number): string[] => {
	const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 20);
	return sentences.slice(0, maxPoints).map((s) => s.trim());
};

const countSyllables = (word: string): number => {
	word = word.toLowerCase();
	if (word.length <= 3) return 1;

	word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "");
	word = word.replace(/^y/, "");

	const syllableMatches = word.match(/[aeiouy]{1,2}/g);
	return syllableMatches ? syllableMatches.length : 1;
};

const calculateBasicQuality = (content: string): number => {
	let score = 50; // Base score

	// Length check
	if (content.length > 500) score += 10;
	if (content.length > 1000) score += 10;

	// Structure check (paragraphs)
	const paragraphs = content.split("\n\n").filter((p) => p.trim().length > 0);
	if (paragraphs.length > 3) score += 10;

	// Capital letters at sentence starts
	const sentences = content.split(/[.!?]+/);
	const capitalizedSentences = sentences.filter((s) =>
		/^[A-Z]/.test(s.trim()),
	).length;
	const capitalizationRatio = capitalizedSentences / Math.max(1, sentences.length);
	score += capitalizationRatio * 10;

	// Punctuation usage
	const punctuationCount = (content.match(/[.,;:!?]/g) || []).length;
	const wordCount = content.split(/\s+/).length;
	if (punctuationCount / wordCount > 0.05) score += 10;

	return Math.min(100, Math.max(0, score));
};

const documentCategorizationService = {
	categorizeDocument,
	extractEntities,
	extractKeyPoints,
	calculateReadabilityScore,
	assessDocumentQuality,
	detectDocumentLanguage,
	analyzeSentiment,
};

export default documentCategorizationService;
