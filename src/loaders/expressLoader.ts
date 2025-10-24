import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import morgan from "morgan";
import { logger } from "../config/logger.js";
import rateLimitMiddleware from "../middleware/rateLimit.js";

const initializeExpress = (): Express => {
	const app = express();

	// Security middleware
	app.use(
		helmet({
			contentSecurityPolicy: {
				directives: {
					defaultSrc: ["'self'"],
					styleSrc: ["'self'", "'unsafe-inline'"],
					scriptSrc: ["'self'"],
					imgSrc: ["'self'", "data:", "https:"],
				},
			},
		}),
	);

	// CORS configuration
	app.use(
		cors({
			origin: process.env.FRONTEND_URL || "http://localhost:3001",
			credentials: true,
			methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
			allowedHeaders: ["Content-Type", "Authorization"],
		}),
	);

	// General middleware
	app.use(compression());
	app.use(cookieParser());
	app.use(express.json({ limit: "10mb" }));
	app.use(express.urlencoded({ extended: true, limit: "10mb" }));

	// Logging
	app.use(
		morgan("combined", {
			stream: {
				write: (message: string) => {
					logger.info(message.trim());
				},
			},
		}),
	);

	// Rate limiting
	app.use(rateLimitMiddleware.generalRateLimit);

	// Health check endpoint
	app.get("/health", (_req, res) => {
		res.json({
			status: "healthy",
			timestamp: new Date().toISOString(),
			version: "1.0.0",
			environment: process.env.NODE_ENV || "development",
		});
	});

	logger.info("🚀 Express app initialized");
	return app;
};

const expressLoader = {
	initializeExpress,
};

export default expressLoader;
