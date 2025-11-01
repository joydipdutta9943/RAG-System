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
			origin: (origin, callback) => {
				// In development/staging, be more permissive
				if (process.env.NODE_ENV !== "production") {
					// Allow any origin in development
					return callback(null, true);
				}

				// Production: List of allowed origins
				const allowedOrigins = [
					process.env.FRONTEND_URL,
					"http://localhost:3001",
					"http://localhost:3000",
					"https://localhost:3001",
					"https://localhost:3000",
					// Add specific production domains
					"http://ec2-50-19-166-175.compute-1.amazonaws.com",
					"https://ec2-50-19-166-175.compute-1.amazonaws.com",
				].filter(Boolean);

				// Allow requests with no origin (mobile apps, curl, Postman, etc.)
				if (!origin) {
					return callback(null, true);
				}

				// Check if origin is in allowed list
				if (allowedOrigins.includes(origin)) {
					callback(null, true);
				} else {
					logger.warn(`CORS blocked origin: ${origin}`);
					callback(new Error("Not allowed by CORS"));
				}
			},
			credentials: true,
			methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
			allowedHeaders: [
				"Content-Type",
				"Authorization",
				"X-Requested-With",
				"Accept",
				"Origin",
			],
			exposedHeaders: ["Set-Cookie"],
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
