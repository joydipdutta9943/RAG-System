import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger } from "../config/logger.js";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || "");
const model = genAI.getGenerativeModel({
	model: "gemini-2.0-flash-exp",
});

interface MultilevelSummaries {
	oneSentence: string;
	paragraph: string;
	executive: string;
	chapters?: ChapterSummary[];
	bulletPoints: string[];
}

interface ChapterSummary {
	chapter: string;
	title: string;
	summary: string;
}

interface ContentRewrite {
	rewritten: string;
	tone: string;
	changes: string[];
}

interface TitleSuggestion {
	titles: string[];
	recommended: string;
}

const generateOneSentenceSummary = async (content: string): Promise<string> => {
	try {
		const prompt = `Summarize this document in exactly ONE sentence. Be concise and capture the main point.

Content: ${content.substring(0, 2000)}

Provide just the one-sentence summary.`;

		const result = await model.generateContent(prompt);
		const summary = result.response.text().trim();

		logger.info("One-sentence summary generated");
		return summary;
	} catch (error) {
		logger.error("Error generating one-sentence summary:", error);
		// Fallback: First sentence of content
		return content.split(/[.!?]/)[0]?.trim() || "Summary unavailable";
	}
};

const generateParagraphSummary = async (content: string): Promise<string> => {
	try {
		const prompt = `Summarize this document in a single paragraph (3-5 sentences). Capture the main ideas.

Content: ${content.substring(0, 3000)}

Provide the paragraph summary.`;

		const result = await model.generateContent(prompt);
		const summary = result.response.text().trim();

		logger.info("Paragraph summary generated");
		return summary;
	} catch (error) {
		logger.error("Error generating paragraph summary:", error);
		return "Summary generation failed";
	}
};

const generateExecutiveSummary = async (content: string): Promise<string> => {
	try {
		const prompt = `Create an executive summary of this document (5-10 sentences). Include:
1. Main purpose/objective
2. Key findings or points
3. Conclusions or recommendations

Content: ${content}

Provide a comprehensive executive summary.`;

		const result = await model.generateContent(prompt);
		const summary = result.response.text().trim();

		logger.info("Executive summary generated");
		return summary;
	} catch (error) {
		logger.error("Error generating executive summary:", error);
		return "Executive summary generation failed";
	}
};

const generateChapterSummaries = async (
	content: string,
): Promise<ChapterSummary[]> => {
	try {
		const prompt = `Break down this document into logical chapters/sections and provide a summary for each.

Content: ${content}

Respond in JSON format:
{
  "chapters": [
    {
      "chapter": "Introduction",
      "title": "Overview of the Topic",
      "summary": "This chapter introduces..."
    }
  ]
}`;

		const result = await model.generateContent(prompt);
		const response = result.response.text();

		// Parse JSON response
		const jsonMatch = response.match(/\{[\s\S]*\}/);
		if (jsonMatch) {
			const data = JSON.parse(jsonMatch[0]);
			logger.info(`Generated ${data.chapters?.length || 0} chapter summaries`);
			return data.chapters || [];
		}

		// Fallback: Simple paragraph-based chapters
		return createSimpleChapters(content);
	} catch (error) {
		logger.error("Error generating chapter summaries:", error);
		return createSimpleChapters(content);
	}
};

const generateBulletPoints = async (
	content: string,
	maxPoints: number = 10,
): Promise<string[]> => {
	try {
		const prompt = `Convert this document into ${maxPoints} clear, concise bullet points. Focus on the most important information.

Content: ${content}

Provide numbered bullet points.`;

		const result = await model.generateContent(prompt);
		const response = result.response.text();

		// Extract bullet points
		const bulletPoints = response
			.split("\n")
			.filter((line) => line.trim().match(/^[\d\-\*•]/))
			.map((line) => line.replace(/^[\d\-\*•.\s]+/, "").trim())
			.filter((line) => line.length > 0)
			.slice(0, maxPoints);

		logger.info(`Generated ${bulletPoints.length} bullet points`);
		return bulletPoints;
	} catch (error) {
		logger.error("Error generating bullet points:", error);
		return [];
	}
};

const generateAllSummaries = async (
	content: string,
): Promise<MultilevelSummaries> => {
	try {
		const [oneSentence, paragraph, executive, bulletPoints] =
			await Promise.all([
				generateOneSentenceSummary(content),
				generateParagraphSummary(content),
				generateExecutiveSummary(content),
				generateBulletPoints(content),
			]);

		// Generate chapters only for longer documents
		let chapters: ChapterSummary[] | undefined;
		if (content.length > 5000) {
			chapters = await generateChapterSummaries(content);
		}

		logger.info("All summary levels generated");

		return {
			oneSentence,
			paragraph,
			executive,
			chapters,
			bulletPoints,
		};
	} catch (error) {
		logger.error("Error generating all summaries:", error);
		throw new Error("Failed to generate summaries");
	}
};

const rewriteContent = async (
	content: string,
	tone: "formal" | "casual" | "technical" | "simple",
): Promise<ContentRewrite> => {
	try {
		const toneDescriptions = {
			formal: "professional and formal business language",
			casual: "conversational and friendly tone",
			technical: "technical and precise language with jargon",
			simple: "simple, easy-to-understand language for general audience",
		};

		const prompt = `Rewrite this content in a ${toneDescriptions[tone]}.

Original Content: ${content}

Provide the rewritten content maintaining the same information but in the specified tone.`;

		const result = await model.generateContent(prompt);
		const rewritten = result.response.text().trim();

		logger.info(`Content rewritten in ${tone} tone`);

		return {
			rewritten,
			tone,
			changes: [`Changed tone to ${tone}`],
		};
	} catch (error) {
		logger.error("Error rewriting content:", error);
		throw new Error("Failed to rewrite content");
	}
};

const generateTitles = async (
	content: string,
	count: number = 5,
): Promise<TitleSuggestion> => {
	try {
		const prompt = `Generate ${count} compelling title options for this document. Make them catchy and accurate.

Content: ${content.substring(0, 1500)}

Provide ${count} title options and indicate which is the best.

Respond in JSON format:
{
  "titles": ["Title 1", "Title 2", "Title 3"],
  "recommended": "Title 1"
}`;

		const result = await model.generateContent(prompt);
		const response = result.response.text();

		// Parse JSON response
		const jsonMatch = response.match(/\{[\s\S]*\}/);
		if (jsonMatch) {
			const titleData = JSON.parse(jsonMatch[0]);
			logger.info(`Generated ${titleData.titles?.length || 0} title suggestions`);
			return titleData;
		}

		// Fallback
		return {
			titles: ["Document Title"],
			recommended: "Document Title",
		};
	} catch (error) {
		logger.error("Error generating titles:", error);
		return {
			titles: ["Document Title"],
			recommended: "Document Title",
		};
	}
};

const generateReport = async (documentContents: string[]): Promise<string> => {
	try {
		const combinedContent = documentContents.join("\n\n---\n\n");

		const prompt = `Create a comprehensive report combining information from these multiple documents:

${combinedContent.substring(0, 10000)}

Structure the report with:
1. Executive Summary
2. Key Findings
3. Detailed Analysis
4. Conclusions
5. Recommendations (if applicable)`;

		const result = await model.generateContent(prompt);
		const report = result.response.text().trim();

		logger.info("Combined report generated from multiple documents");
		return report;
	} catch (error) {
		logger.error("Error generating report:", error);
		throw new Error("Failed to generate report");
	}
};

const extractActionItems = async (content: string): Promise<string[]> => {
	try {
		const prompt = `Extract all action items, tasks, or to-dos from this document.

Content: ${content}

Provide a list of actionable items.`;

		const result = await model.generateContent(prompt);
		const response = result.response.text();

		// Extract action items
		const actionItems = response
			.split("\n")
			.filter((line) => line.trim().match(/^[\d\-\*•]/))
			.map((line) => line.replace(/^[\d\-\*•.\s]+/, "").trim())
			.filter((line) => line.length > 0);

		logger.info(`Extracted ${actionItems.length} action items`);
		return actionItems;
	} catch (error) {
		logger.error("Error extracting action items:", error);
		return [];
	}
};

const generateQAPairs = async (
	content: string,
	count: number = 5,
): Promise<Array<{ question: string; answer: string }>> => {
	try {
		const prompt = `Generate ${count} question-answer pairs from this document that could be used for training or testing comprehension.

Content: ${content}

Respond in JSON format:
{
  "qaPairs": [
    {"question": "What is...?", "answer": "It is..."}
  ]
}`;

		const result = await model.generateContent(prompt);
		const response = result.response.text();

		// Parse JSON response
		const jsonMatch = response.match(/\{[\s\S]*\}/);
		if (jsonMatch) {
			const data = JSON.parse(jsonMatch[0]);
			logger.info(`Generated ${data.qaPairs?.length || 0} Q&A pairs`);
			return data.qaPairs || [];
		}

		return [];
	} catch (error) {
		logger.error("Error generating Q&A pairs:", error);
		return [];
	}
};

// Helper functions
const createSimpleChapters = (content: string): ChapterSummary[] => {
	const paragraphs = content.split("\n\n").filter((p) => p.trim().length > 100);

	return paragraphs.slice(0, 5).map((paragraph, index) => ({
		chapter: `Section ${index + 1}`,
		title: `Part ${index + 1}`,
		summary: paragraph.substring(0, 200) + "...",
	}));
};

const summarizationService = {
	generateOneSentenceSummary,
	generateParagraphSummary,
	generateExecutiveSummary,
	generateChapterSummaries,
	generateBulletPoints,
	generateAllSummaries,
	rewriteContent,
	generateTitles,
	generateReport,
	extractActionItems,
	generateQAPairs,
};

export default summarizationService;
