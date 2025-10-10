import { createClient } from "redis";
import { logger } from "../config/logger.js";

const connectToRedis = async () => {
	const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

	try {
		const client = createClient({
			url: redisUrl,
		});

		client.on("error", (err) => {
			logger.error("Redis Client Error:", err);
		});

		client.on("connect", () => {
			logger.info("✅ Redis connected successfully");
		});

		client.on("reconnecting", () => {
			logger.info("🔄 Redis reconnecting...");
		});

		client.on("ready", () => {
			logger.info("✅ Redis client ready");
		});

		await client.connect();
		return client;
	} catch (error) {
		logger.error("❌ Redis connection failed:", error);
		// Return null if Redis is not available, system should continue without it
		return null;
	}
};

const setupRedisHandlers = (client: any) => {
	if (!client) return;

	client.on("error", (err: any) => {
		logger.error("Redis error:", err);
	});
};

const testRedisConnection = async (client: any) => {
	if (!client) return false;

	try {
		await client.ping();
		return true;
	} catch (error) {
		logger.warn("Redis ping failed:", error);
		return false;
	}
};

const redisLoader = {
	connectToRedis,
	setupRedisHandlers,
	testRedisConnection,
};

export default redisLoader;
