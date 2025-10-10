import type { Request, Response } from "express";
import { APP_CONFIG } from "../utils/constantUtils.js";
import { responseUtils } from "../utils/index.js";

const healthCheckHandler = (_req: Request, res: Response): Response => {
	return res.json(
		responseUtils.successResponse("Health check successful", {
			status: "healthy",
			timestamp: new Date().toISOString(),
			version: APP_CONFIG.VERSION,
			environment: APP_CONFIG.ENVIRONMENT,
			uptime: process.uptime(),
			memory: process.memoryUsage(),
		}),
	);
};

const readinessHandler = (_req: Request, res: Response): Response => {
	// Check if the application is ready to accept traffic
	const isReady = true; // Add actual readiness checks here

	if (isReady) {
		return res.json(
			responseUtils.successResponse("Application is ready", {
				status: "ready",
				timestamp: new Date().toISOString(),
			}),
		);
	} else {
		return res.status(503).json(
			responseUtils.errorResponse("Application is not ready", {
				status: "not_ready",
				timestamp: new Date().toISOString(),
			}),
		);
	}
};

const livenessHandler = (_req: Request, res: Response): Response => {
	// Check if the application is running
	return res.json(
		responseUtils.successResponse("Application is alive", {
			status: "alive",
			timestamp: new Date().toISOString(),
			uptime: process.uptime(),
		}),
	);
};

const metricsHandler = (_req: Request, res: Response): Response => {
	// Basic system metrics
	const metrics = {
		timestamp: new Date().toISOString(),
		uptime: process.uptime(),
		memory: process.memoryUsage(),
		cpu: process.cpuUsage(),
		platform: process.platform,
		nodeVersion: process.version,
	};

	return res.json(
		responseUtils.successResponse("System metrics retrieved", metrics),
	);
};

const healthController = {
	healthCheckHandler,
	readinessHandler,
	livenessHandler,
	metricsHandler,
};

export default healthController;
