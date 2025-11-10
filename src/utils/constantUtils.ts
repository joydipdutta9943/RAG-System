// Application constants
export const APP_CONFIG = {
	NAME: "Enhanced RAG System",
	VERSION: "1.0.0",
	ENVIRONMENT: process.env.NODE_ENV || "development",
	PORT: parseInt(process.env.PORT || "3000", 10),
} as const;

// Database constants
export const DATABASE_CONFIG = {
	DEFAULT_LIMIT: 10,
	MAX_LIMIT: 100,
	CONNECTION_TIMEOUT: 30000, // 30 seconds
} as const;

// Redis constants
export const REDIS_CONFIG = {
	DEFAULT_TTL: 3600, // 1 hour
	EMBEDDING_CACHE_TTL: 86400, // 24 hours
	SEARCH_CACHE_TTL: 300, // 5 minutes
} as const;

// File upload constants
export const UPLOAD_CONFIG = {
	MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
	ALLOWED_TYPES: [
		"text/plain",
		"application/pdf",
		"image/jpeg",
		"image/png",
		"image/gif",
		"image/webp",
		"image/bmp",
	],
	MAX_FILES_PER_REQUEST: 5,
} as const;

// Rate limiting constants
export const RATE_LIMIT_CONFIG = {
	DEFAULT_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
	DEFAULT_MAX_REQUESTS: 100,
	AUTH_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
	AUTH_MAX_REQUESTS: 1000,
	UPLOAD_WINDOW_MS: 60 * 60 * 1000, // 1 hour
	UPLOAD_MAX_REQUESTS: 10,
} as const;

// AI Service constants
export const AI_CONFIG = {
	DEFAULT_MODEL: "text-embedding-004",
	DEFAULT_IMAGE_MODEL: "multimodalembedding",
	MAX_CONTEXT_LENGTH: 4096,
	TEMPERATURE: 0.7,
	MAX_TOKENS: 1000,
} as const;

// Vector search constants
export const VECTOR_CONFIG = {
	DEFAULT_MODEL: "text-embedding-004",
	DEFAULT_IMAGE_MODEL: "multimodalembedding",
	DEFAULT_DIMENSIONS: 768, // Google's text-embedding-004 produces 768-dimensional embeddings by default
	// Note: Both text and image embeddings use the same dimensions for consistency
	SIMILARITY_THRESHOLD: 0.7,
	MAX_CANDIDATES: 100,
	DEFAULT_LIMIT: 10,
} as const;

// Security constants
export const SECURITY_CONFIG = {
	JWT_SECRET: process.env.JWT_SECRET || "your-secret-key",
	JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
	BCRYPT_ROUNDS: 12,
	SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours
} as const;

// Cookie constants
export const COOKIE_CONFIG = {
	NAME: "token",
	MAX_AGE: 7 * 24 * 60 * 60 * 1000, // 7 days
	HTTP_ONLY: true,
	// Secure should be true in production/staging (HTTPS), false in development (HTTP)
	SECURE:
		process.env.NODE_ENV === "production" || process.env.NODE_ENV === "staging",
	// Use 'none' for cross-origin with credentials, 'lax' for same-origin
	// 'none' requires secure: true, so we conditionally set it
	SAME_SITE:
		process.env.NODE_ENV === "production" || process.env.NODE_ENV === "staging"
			? ("none" as const)
			: ("lax" as const),
	PATH: "/",
	// Only set domain if explicitly configured to avoid cross-domain issues
	DOMAIN: process.env.COOKIE_DOMAIN || undefined,
} as const;

// WebSocket constants
export const WEBSOCKET_CONFIG = {
	HEARTBEAT_INTERVAL: 30000, // 30 seconds
	CONNECTION_TIMEOUT: 60000, // 60 seconds
	MAX_CONNECTIONS: 1000,
} as const;

const constantUtils = {
	APP_CONFIG,
	DATABASE_CONFIG,
	REDIS_CONFIG,
	VECTOR_CONFIG,
	UPLOAD_CONFIG,
	RATE_LIMIT_CONFIG,
	AI_CONFIG,
	SECURITY_CONFIG,
	COOKIE_CONFIG,
	WEBSOCKET_CONFIG,
};

export default constantUtils;
