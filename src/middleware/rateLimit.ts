import rateLimit from "express-rate-limit";
import { redis } from "../config/database.js";

// Fallback to memory store if Redis is not available or not connected
const useMemoryStore =
	process.env.NODE_ENV === "development" && (!redis || redis.isOpen === false);

// Redis store for rate limiting
const createRedisStore = (prefix: string = "rl:") => {
	const windowMs: number = 60_000;

	const init = (options: { windowMs: number }) => {
		const newWindowMs = options?.windowMs || windowMs;
		return { windowMs: newWindowMs };
	};

	const incr = async (
		key: string,
	): Promise<{ totalHits: number; resetTime?: Date }> => {
		const redisKey = prefix + key;
		// Increment hit counter
		const totalHits = await redis.incr(redisKey);
		// Set TTL on first hit only
		if (totalHits === 1) {
			await redis.pExpire(redisKey, windowMs);
		}
		// Get remaining TTL in seconds and compute reset time
		const ttlSeconds = await redis.ttl(redisKey);
		const ttlMs = ttlSeconds > 0 ? ttlSeconds * 1000 : windowMs;
		const resetTime = new Date(Date.now() + ttlMs);
		return { totalHits, resetTime };
	};

	const decrement = async (key: string): Promise<void> => {
		const redisKey = prefix + key;
		await redis.decr(redisKey);
	};

	const resetKey = async (key: string): Promise<void> => {
		const redisKey = prefix + key;
		await redis.del(redisKey);
	};

	return {
		init,
		incr,
		decrement,
		resetKey,
	};
};

// Create stores
const generalStore = createRedisStore();
const uploadStore = createRedisStore("upload:");
const aiStore = createRedisStore("ai:");
const authStore = createRedisStore("auth:");

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
	store: useMemoryStore
		? undefined
		: ({
				async init(opts: { windowMs: number }) {
					generalStore.init(opts);
				},
				async increment(key: string) {
					return await generalStore.incr(key);
				},
				async decrement(key: string) {
					await generalStore.decrement(key);
				},
				async resetKey(key: string) {
					await generalStore.resetKey(key);
				},
			} as any),
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
	store: useMemoryStore
		? undefined
		: ({
				async init(opts: { windowMs: number }) {
					uploadStore.init(opts);
				},
				async increment(key: string) {
					return await uploadStore.incr(key);
				},
				async decrement(key: string) {
					await uploadStore.decrement(key);
				},
				async resetKey(key: string) {
					await uploadStore.resetKey(key);
				},
			} as any),
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
	store: useMemoryStore
		? undefined
		: ({
				async init(opts: { windowMs: number }) {
					aiStore.init(opts);
				},
				async increment(key: string) {
					return await aiStore.incr(key);
				},
				async decrement(key: string) {
					await aiStore.decrement(key);
				},
				async resetKey(key: string) {
					await aiStore.resetKey(key);
				},
			} as any),
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
	store: useMemoryStore
		? undefined
		: ({
				async init(opts: { windowMs: number }) {
					authStore.init(opts);
				},
				async increment(key: string) {
					return await authStore.incr(key);
				},
				async decrement(key: string) {
					await authStore.decrement(key);
				},
				async resetKey(key: string) {
					await authStore.resetKey(key);
				},
			} as any),
	skipSuccessfulRequests: true, // Don't count successful logins
});

const rateLimitMiddleware = {
	generalRateLimit,
	uploadRateLimit,
	aiQueryRateLimit,
	authRateLimit,
};

export default rateLimitMiddleware;
