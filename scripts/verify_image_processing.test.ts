import { describe, expect, it, mock, spyOn } from "bun:test";
import sharp from "sharp";
import documentProcessorService from "../src/services/documentProcessorService";
import embeddingService from "../src/services/embeddingService";
import geminiVisionService from "../src/services/geminiVisionService";

// Mock dependencies
mock.module("sharp", () => {
	return {
		default: () => ({
			metadata: async () => ({ width: 100, height: 100, format: "png" }),
		}),
	};
});

mock.module("tesseract.js", () => {
	return {
		default: {
			recognize: async () => ({
				data: { text: "Mocked OCR Text" },
			}),
		},
	};
});

// Mock services
spyOn(geminiVisionService, "analyzeImage").mockResolvedValue({
	description: "A mocked description of an image",
	detectedObjects: ["object1"],
	hasText: true,
	hasChart: false,
	hasDiagram: false,
	imageCategory: "photo",
	confidence: 0.9,
});

spyOn(embeddingService, "generateTextEmbedding").mockResolvedValue(
	new Array(768).fill(0.1),
);

spyOn(embeddingService, "generateImageEmbedding").mockResolvedValue(
	new Array(512).fill(0.2),
);

describe("Image Processing Verification", () => {
	it("should process image and generate text embedding from description + OCR", async () => {
		const dummyBuffer = Buffer.from("dummy image data");

		const result = await documentProcessorService.processImageFile(
			dummyBuffer,
			1024,
			undefined,
		);

		console.log("Result title:", result.title);
		console.log("Result content:", result.content);
		console.log("Embedding length:", result.embedding.length);

		expect(result.title).toBe("Image Document");
		expect(result.content).toContain(
			"Image Description: A mocked description of an image",
		);
		expect(result.content).toContain("Extracted Text: Mocked OCR Text");
		expect(result.embedding).toHaveLength(768); // Should be text embedding size
		expect(result.metadata.originalOcrText).toBe("Mocked OCR Text");
	});
});
