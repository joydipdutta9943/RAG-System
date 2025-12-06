import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger } from "../config/logger.js";

// Initialize Google Generative AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || "");

// Initialize vision models
const visionModel = genAI.getGenerativeModel({
	model: process.env.GEMINI_MODEL || "gemini-2.5-flash", // Supports vision and multimodal
});

interface VisualAnalysisResult {
	description: string;
	detectedObjects: string[];
	hasText: boolean;
	hasChart: boolean;
	hasDiagram: boolean;
	imageCategory: string;
	confidence: number;
}

interface ChartDataExtraction {
	chartType: string;
	title?: string;
	data: Record<string, any>;
	labels?: string[];
	values?: number[];
	interpretation: string;
}

interface DiagramAnalysis {
	diagramType: string;
	components: string[];
	relationships: string[];
	mainConcepts: string[];
	explanation: string;
}

interface VisualQuestionAnswer {
	question: string;
	answer: string;
	confidence: number;
	sources: string[];
}

const analyzeImage = async (
	imageBuffer: Buffer,
): Promise<VisualAnalysisResult> => {
	try {
		const base64Image = imageBuffer.toString("base64");
		const imagePart = {
			inlineData: {
				data: base64Image,
				mimeType: "image/jpeg",
			},
		};

		const prompt = `Analyze this image comprehensively and provide:
1. A detailed description of what you see
2. List all objects, people, or elements visible
3. Determine if the image contains text (YES/NO)
4. Determine if the image contains charts or graphs (YES/NO)
5. Determine if the image contains diagrams or flowcharts (YES/NO)
6. Categorize the image type (photo, screenshot, chart, diagram, infographic, document, etc.)
7. Rate your confidence in this analysis (0-100%)

Format your response as JSON:
{
  "description": "detailed description",
  "detectedObjects": ["object1", "object2"],
  "hasText": true/false,
  "hasChart": true/false,
  "hasDiagram": true/false,
  "imageCategory": "category",
  "confidence": 95
}`;

		const result = await visionModel.generateContent([prompt, imagePart]);
		const response = result.response.text();

		// Try to parse JSON response
		try {
			const jsonMatch = response.match(/\{[\s\S]*\}/);
			if (jsonMatch) {
				const analysisResult = JSON.parse(jsonMatch[0]);
				logger.info("Image analysis completed successfully");
				return analysisResult;
			}
		} catch (parseError) {
			logger.warn("Failed to parse JSON, using fallback parsing");
		}

		// Fallback: Parse response manually
		return {
			description: response,
			detectedObjects: extractObjects(response),
			hasText: response.toLowerCase().includes("text"),
			hasChart:
				response.toLowerCase().includes("chart") ||
				response.toLowerCase().includes("graph"),
			hasDiagram:
				response.toLowerCase().includes("diagram") ||
				response.toLowerCase().includes("flowchart"),
			imageCategory: extractCategory(response),
			confidence: 70,
		};
	} catch (error) {
		logger.error("Error analyzing image with Gemini Vision:", error);
		throw new Error("Failed to analyze image");
	}
};

const extractChartData = async (
	imageBuffer: Buffer,
): Promise<ChartDataExtraction> => {
	try {
		const base64Image = imageBuffer.toString("base64");
		const imagePart = {
			inlineData: {
				data: base64Image,
				mimeType: "image/jpeg",
			},
		};

		const prompt = `Analyze this chart or graph and extract structured data:
1. Identify the chart type (bar, line, pie, scatter, etc.)
2. Extract the title (if visible)
3. Extract all data points, labels, and values
4. Provide an interpretation of what the chart shows

Format your response as JSON:
{
  "chartType": "bar",
  "title": "Sales Data 2024",
  "data": {"Q1": 100, "Q2": 150},
  "labels": ["Q1", "Q2"],
  "values": [100, 150],
  "interpretation": "Sales increased from Q1 to Q2"
}`;

		const result = await visionModel.generateContent([prompt, imagePart]);
		const response = result.response.text();

		// Parse JSON response
		const jsonMatch = response.match(/\{[\s\S]*\}/);
		if (jsonMatch) {
			return JSON.parse(jsonMatch[0]);
		}

		// Fallback
		return {
			chartType: "unknown",
			data: {},
			interpretation: response,
		};
	} catch (error) {
		logger.error("Error extracting chart data:", error);
		throw new Error("Failed to extract chart data");
	}
};

const analyzeDiagram = async (
	imageBuffer: Buffer,
): Promise<DiagramAnalysis> => {
	try {
		const base64Image = imageBuffer.toString("base64");
		const imagePart = {
			inlineData: {
				data: base64Image,
				mimeType: "image/jpeg",
			},
		};

		const prompt = `Analyze this diagram and extract:
1. Type of diagram (flowchart, UML, mind map, architecture, etc.)
2. List all components/boxes/nodes
3. Describe relationships between components
4. Identify main concepts
5. Provide a comprehensive explanation

Format as JSON:
{
  "diagramType": "flowchart",
  "components": ["component1", "component2"],
  "relationships": ["A connects to B", "B leads to C"],
  "mainConcepts": ["concept1", "concept2"],
  "explanation": "This diagram shows..."
}`;

		const result = await visionModel.generateContent([prompt, imagePart]);
		const response = result.response.text();

		// Parse JSON response
		const jsonMatch = response.match(/\{[\s\S]*\}/);
		if (jsonMatch) {
			return JSON.parse(jsonMatch[0]);
		}

		// Fallback
		return {
			diagramType: "unknown",
			components: [],
			relationships: [],
			mainConcepts: [],
			explanation: response,
		};
	} catch (error) {
		logger.error("Error analyzing diagram:", error);
		throw new Error("Failed to analyze diagram");
	}
};

const answerVisualQuestion = async (
	imageBuffer: Buffer,
	question: string,
): Promise<VisualQuestionAnswer> => {
	try {
		const base64Image = imageBuffer.toString("base64");
		const imagePart = {
			inlineData: {
				data: base64Image,
				mimeType: "image/jpeg",
			},
		};

		const prompt = `Answer this question about the image: "${question}"

Provide a detailed answer based on what you can see in the image. Be specific and cite visual elements.`;

		const result = await visionModel.generateContent([prompt, imagePart]);
		const answer = result.response.text();

		logger.info(`Visual question answered: ${question}`);

		return {
			question,
			answer: answer.trim(),
			confidence: 85,
			sources: ["gemini-vision"],
		};
	} catch (error) {
		logger.error("Error answering visual question:", error);
		throw new Error("Failed to answer visual question");
	}
};

const compareImages = async (
	image1Buffer: Buffer,
	image2Buffer: Buffer,
): Promise<string> => {
	try {
		const base64Image1 = image1Buffer.toString("base64");
		const base64Image2 = image2Buffer.toString("base64");

		const image1Part = {
			inlineData: {
				data: base64Image1,
				mimeType: "image/jpeg",
			},
		};

		const image2Part = {
			inlineData: {
				data: base64Image2,
				mimeType: "image/jpeg",
			},
		};

		const prompt = `Compare these two images and describe:
1. Similarities between them
2. Differences between them
3. What changed (if they appear to be versions of the same thing)
4. Overall assessment`;

		const result = await visionModel.generateContent([
			prompt,
			image1Part,
			image2Part,
		]);
		const comparison = result.response.text();

		logger.info("Image comparison completed");
		return comparison;
	} catch (error) {
		logger.error("Error comparing images:", error);
		throw new Error("Failed to compare images");
	}
};

const detectTextInImage = async (imageBuffer: Buffer): Promise<string> => {
	try {
		const base64Image = imageBuffer.toString("base64");
		const imagePart = {
			inlineData: {
				data: base64Image,
				mimeType: "image/jpeg",
			},
		};

		const prompt = `Extract all visible text from this image. Return only the text, preserving formatting as much as possible.`;

		const result = await visionModel.generateContent([prompt, imagePart]);
		const extractedText = result.response.text();

		logger.info("Text extraction from image completed");
		return extractedText.trim();
	} catch (error) {
		logger.error("Error detecting text in image:", error);
		throw new Error("Failed to detect text in image");
	}
};

// Helper functions
const extractObjects = (text: string): string[] => {
	const objects: string[] = [];
	const patterns = [
		/objects?:\s*([^.\n]+)/gi,
		/elements?:\s*([^.\n]+)/gi,
		/contains?:\s*([^.\n]+)/gi,
	];

	for (const pattern of patterns) {
		const matches = text.match(pattern);
		if (matches) {
			for (const match of matches) {
				const items = match
					.split(/[:,]/)[1]
					?.split(/,|and/)
					.map((s) => s.trim())
					.filter((s) => s.length > 0);
				if (items) objects.push(...items);
			}
		}
	}

	return [...new Set(objects)].slice(0, 10);
};

const extractCategory = (text: string): string => {
	const categories = [
		"photo",
		"screenshot",
		"chart",
		"graph",
		"diagram",
		"flowchart",
		"infographic",
		"document",
		"illustration",
	];

	const lowerText = text.toLowerCase();
	for (const category of categories) {
		if (lowerText.includes(category)) {
			return category;
		}
	}

	return "image";
};

const convertDiagramToMermaid = async (
	imageBuffer: Buffer,
): Promise<string> => {
	try {
		const base64Image = imageBuffer.toString("base64");
		const imagePart = {
			inlineData: {
				data: base64Image,
				mimeType: "image/jpeg",
			},
		};

		const prompt = `Analyze this diagram/flowchart and convert it into Mermaid.js code.
		
		Rules:
		1. Output ONLY the Mermaid code block.
		2. Do not include markdown backticks or "mermaid" language identifier.
		3. Use standard Mermaid syntax (graph TD, sequenceDiagram, etc.).
		4. Ensure all nodes and relationships are captured accurately.
		5. If text is illegible, use reasonable placeholders.
		
		Example Output:
		graph TD
		A[Start] --> B{Decision}
		B -->|Yes| C[Process]
		B -->|No| D[End]`;

		const result = await visionModel.generateContent([prompt, imagePart]);
		const mermaidCode = result.response.text().trim();

		// Clean up response if it contains markdown code blocks
		const cleanCode = mermaidCode.replace(/```mermaid\n?|```/g, "").trim();

		logger.info("Diagram converted to Mermaid code");
		return cleanCode;
	} catch (error) {
		logger.error("Error converting diagram to Mermaid:", error);
		throw new Error("Failed to convert diagram to Mermaid");
	}
};

const geminiVisionService = {
	analyzeImage,
	extractChartData,
	analyzeDiagram,
	answerVisualQuestion,
	compareImages,
	detectTextInImage,
	convertDiagramToMermaid,
};

export default geminiVisionService;
