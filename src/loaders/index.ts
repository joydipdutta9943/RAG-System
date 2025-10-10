import type { Express } from "express";
import databaseLoader from "./databaseLoader.js";
import expressLoader from "./expressLoader.js";
import loggerLoader from "./loggerLoader.js";
import redisLoader from "./redisLoader.js";

interface LoaderResult {
	database: any;
	redis: any;
	logger: any;
	express: Express;
}

const initializeDatabase = async (): Promise<any> => {
	const client = await databaseLoader.connectToDatabase();
	databaseLoader.setupConnectionPool(client);
	databaseLoader.handleConnectionEvents(client);
	return client;
};

const initializeRedis = async (): Promise<any> => {
	const client = await redisLoader.connectToRedis();
	if (client) {
		redisLoader.setupRedisHandlers(client);
		await redisLoader.testRedisConnection(client);
	}
	return client;
};

const initializeLogger = (): any => {
	return loggerLoader.initializeLogger();
};

const initializeExpress = (): Express => {
	return expressLoader.initializeExpress();
};

const initializeAllServices = async (): Promise<LoaderResult> => {
	try {
		const logger = initializeLogger();
		logger.info("🚀 Starting Enhanced RAG System initialization...");

		const express = initializeExpress();

		logger.info("🔌 Connecting to databases...");
		const database = await initializeDatabase();
		const redis = await initializeRedis();

		logger.info("✅ All services initialized successfully");

		return {
			database,
			redis,
			logger,
			express,
		};
	} catch (error) {
		const logger = initializeLogger();
		logger.error("❌ Failed to initialize services:", error);
		throw error;
	}
};

const loaderService = {
	initializeDatabase,
	initializeRedis,
	initializeLogger,
	initializeExpress,
	initializeAllServices,
};

export default loaderService;
