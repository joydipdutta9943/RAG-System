export interface SearchResult {
	id: string;
	title: string;
	content: string;
	score: number;
	metadata?: SearchMetadata;
}

export interface SearchMetadata {
	userId?: string;
	fileType?: string;
	createdAt?: Date;
	updatedAt?: Date;
	vectorScore?: number;
	textScore?: number;
}

export interface SearchQuery {
	query: string;
	limit?: number;
	page?: number;
	filter?: SearchFilter;
	searchType: "vector" | "hybrid" | "text";
	similarity?: "cosine" | "euclidean" | "dotProduct";
}

export interface SearchFilter {
	userId?: string;
	fileType?: string | string[];
	dateRange?: {
		start: Date;
		end: Date;
	};
	entities?: string[];
	topics?: string[];
	language?: string;
}

export interface SearchOptions {
	limit?: number;
	numCandidates?: number;
	filter?: SearchFilter;
	similarity?: "cosine" | "euclidean" | "dotProduct";
}

export interface VectorSearchOptions extends SearchOptions {}

export interface HybridSearchOptions extends SearchOptions {
	textWeight?: number;
	vectorWeight?: number;
}

export interface VectorSearchResult {
	id: string;
	title: string;
	content: string;
	score: number;
	metadata?: SearchMetadata;
}

export interface SearchResponse {
	results: SearchResult[];
	totalCount: number;
	page: number;
	limit: number;
	query: string;
	searchType: string;
	processingTime: number;
}

export interface SimilarDocumentResult {
	id: string;
	title: string;
	content: string;
	score: number;
	metadata?: SearchMetadata;
}

export interface SearchStats {
	totalDocuments: number;
	indexedDocuments: number;
	averageIndexingTime: number;
	searchPerformance: {
		averageResponseTime: number;
		totalSearches: number;
	};
}
