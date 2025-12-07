import rateLimit from "express-rate-limit";

// For now, use memory store for rate limiting
// Redis integration can be added later if needed

// General API rate limiting
const generalRateLimit = rateLimit({
	windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 10), // 15 minutes
	max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100", 10), // 100 requests per window
	message: {
		error: "Too many requests",
		message: "Rate limit exceeded. Please try again later.",
		retryAfter: "15 minutes",
	},
	standardHeaders: true,
	legacyHeaders: false,
	keyGenerator: (req) => {
		return req.ip || "unknown";
	},
});

// Strict rate limiting for upload endpoints
const uploadRateLimit = rateLimit({
	windowMs: 60 * 1000, // 1 minute
	max: 5, // 5 uploads per minute
	message: {
		error: "Upload rate limit exceeded",
		message: "Too many file uploads. Please wait before uploading again.",
		retryAfter: "1 minute",
	},
	standardHeaders: true,
	legacyHeaders: false,
});

// AI query rate limiting
const aiQueryRateLimit = rateLimit({
	windowMs: 60 * 1000, // 1 minute
	max: 10, // 10 AI queries per minute
	message: {
		error: "AI query rate limit exceeded",
		message: "Too many AI queries. Please wait before making another request.",
		retryAfter: "1 minute",
	},
	standardHeaders: true,
	legacyHeaders: false,
});

// Authentication rate limiting
const authRateLimit = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 5, // 5 login attempts per window
	message: {
		error: "Authentication rate limit exceeded",
		message: "Too many login attempts. Please try again later.",
		retryAfter: "15 minutes",
	},
	standardHeaders: true,
	legacyHeaders: false,
	skipSuccessfulRequests: true, // Don't count successful logins
});

const rateLimitMiddleware = {
	generalRateLimit,
	uploadRateLimit,
	aiQueryRateLimit,
	authRateLimit,
};

export default rateLimitMiddleware;
