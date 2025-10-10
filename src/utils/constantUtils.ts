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
	DEFAULT_MODEL: "Xenova/all-MiniLM-L6-v2",
	DEFAULT_IMAGE_MODEL: "Xenova/clip-vit-base-patch32",
	MAX_CONTEXT_LENGTH: 4096,
	TEMPERATURE: 0.7,
	MAX_TOKENS: 1000,
} as const;

// Vector search constants
export const VECTOR_CONFIG = {
	DEFAULT_MODEL: "Xenova/all-MiniLM-L6-v2",
	DEFAULT_IMAGE_MODEL: "Xenova/clip-vit-base-patch32",
	DEFAULT_DIMENSIONS: 384,
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
	WEBSOCKET_CONFIG,
};

export default constantUtils;
