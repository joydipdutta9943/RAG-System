export interface Document {
	id: string;
	title: string;
	content: string;
	fileType: string;
	fileSize: number;
	embedding?: number[];
	metadata?: DocumentMetadata;
	summary?: string;
	entities: string[];
	topics: string[];
	sentiment?: number;
	language?: string;
	userId: string;
	createdAt: Date;
	updatedAt: Date;
}

export interface DocumentCreateData {
	title: string;
	content: string;
	fileType: string;
	fileSize: number;
	embedding?: number[];
	metadata?: DocumentMetadata;
	summary?: string;
	entities?: string[];
	topics?: string[];
	sentiment?: number;
	language?: string;
	userId: string;
}

export interface DocumentUpdateData {
	title?: string;
	content?: string;
	embedding?: number[];
	metadata?: DocumentMetadata;
	summary?: string;
	entities?: string[];
	topics?: string[];
	sentiment?: number;
	language?: string;
}

export interface DocumentMetadata {
	pageCount?: number;
	author?: string;
	keywords?: string[];
	description?: string;
	customFields?: Record<string, any>;
	language?: string;
	extractedImages?: number;
}

export interface ProcessedDocument {
	title: string;
	content: string;
	fileSize: number;
	metadata: DocumentMetadata;
	images: ProcessedImage[];
	embedding: number[];
}

export interface ProcessedImage {
	description?: string;
	ocrText?: string;
	embedding: number[];
	metadata: ImageMetadata;
}

export interface ImageMetadata {
	width: number;
	height: number;
	format: string;
	size: number;
}

export interface DocumentSearchResult {
	id: string;
	title: string;
	content: string;
	score: number;
	fileType: string;
	fileSize: number;
	createdAt: Date;
	userId: string;
	metadata?: DocumentMetadata;
}

export interface DocumentStats {
	totalDocuments: number;
	totalSize: number;
	averageSize: number;
	fileTypeDistribution: Record<string, number>;
	dailyUploads?: Record<string, number>;
}
