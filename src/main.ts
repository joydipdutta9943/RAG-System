import { createServer } from "node:http";
import { Server as SocketIOServer } from "socket.io";
import { logger } from "./config/logger.js";
import loaderService from "./loaders/index.js";
import errorHandlerMiddleware from "./middleware/errorHandlerMiddleware.js";
// Import routes
import authRoutes from "./routes/auth.js";
import documentRoutes from "./routes/documents.js";
import healthRoutes from "./routes/healthRoutes.js";
import searchRoutes from "./routes/search.js";
// Import services
import {
	aiAgentLangchainService,
	embeddingService,
	vectorSearchService,
} from "./services/index.js";
import { APP_CONFIG } from "./utils/constantUtils.js";

let server: any;
let io: SocketIOServer;

const startServer = async () => {
	try {
		// Initialize all services
		const { database, redis, logger, express } =
			await loaderService.initializeAllServices();

		// Initialize application services with database and redis
		const db = database.db();
		await vectorSearchService.initialize(db, redis);
		aiAgentLangchainService.initialize();

		// Create HTTP server
		server = createServer(express);
		io = new SocketIOServer(server, {
			cors: {
				origin: process.env.FRONTEND_URL || "http://localhost:3001",
				methods: ["GET", "POST"],
			},
		});

		// Setup WebSocket handlers
		setupWebSocketHandlers(io, logger);

		// API routes
		express.use("/api/auth", authRoutes);
		express.use("/api/documents", documentRoutes);
		express.use("/api/search", searchRoutes);
		express.use("/health", healthRoutes.setupHealthRoutes());

		// Error handling
		express.use(errorHandlerMiddleware.notFoundHandler);
		express.use(errorHandlerMiddleware.errorHandler);

		// Graceful shutdown
		setupGracefulShutdown(server, database, logger);

		// Start server
		server.listen(APP_CONFIG.PORT, () => {
			logger.info(
				`🚀 Enhanced RAG System server running on port ${APP_CONFIG.PORT}`,
			);
			logger.info(`📚 Environment: ${APP_CONFIG.ENVIRONMENT}`);
			logger.info(
				`🔗 Health check: http://localhost:${APP_CONFIG.PORT}/health`,
			);

			if (APP_CONFIG.ENVIRONMENT === "development") {
				logger.info(
					`📖 API Documentation: http://localhost:${APP_CONFIG.PORT}/api`,
				);
			}
		});

		// Store references in global scope for cleanup
		(global as any).server = server;
		(global as any).database = database;
		(global as any).io = io;
	} catch (error) {
		const fallbackLogger = logger || console;
		fallbackLogger.error("❌ Failed to start server:", error);
		process.exit(1);
	}
};

const setupWebSocketHandlers = (io: SocketIOServer, logger: any) => {
	io.on("connection", (socket) => {
		logger.info(`Client connected: ${socket.id}`);

		socket.on("join-room", (roomId) => {
			socket.join(roomId);
			logger.info(`Client ${socket.id} joined room: ${roomId}`);
		});

		socket.on("leave-room", (roomId) => {
			socket.leave(roomId);
			logger.info(`Client ${socket.id} left room: ${roomId}`);
		});

		socket.on("document-processing", (data) => {
			// Broadcast document processing updates
			socket.to(data.roomId).emit("processing-update", {
				documentId: data.documentId,
				status: data.status,
				progress: data.progress,
			});
		});

		socket.on("disconnect", () => {
			logger.info(`Client disconnected: ${socket.id}`);
		});
	});
};

const setupGracefulShutdown = (server: any, database: any, logger: any) => {
	const shutdown = async (signal: string) => {
		logger.info(`${signal} received, shutting down gracefully`);

		// Close HTTP server
		if (server) {
			await new Promise<void>((resolve) => {
				server.close(() => {
					logger.info("HTTP server closed");
					resolve();
				});
			});
		}

		// Close database connection
		if (database && typeof database.close === "function") {
			await database.close();
			logger.info("Database connection closed");
		}

		// Close Socket.IO
		if (io) {
			await new Promise<void>((resolve) => {
				io.close(() => {
					logger.info("Socket.IO server closed");
					resolve();
				});
			});
		}

		process.exit(0);
	};

	process.on("SIGTERM", () => shutdown("SIGTERM"));
	process.on("SIGINT", () => shutdown("SIGINT"));

	// Handle uncaught exceptions
	process.on("uncaughtException", (error) => {
		logger.error("Uncaught exception:", error);
		shutdown("uncaughtException");
	});

	// Handle unhandled promise rejections
	process.on("unhandledRejection", (reason, promise) => {
		logger.error("Unhandled rejection at:", promise, "reason:", reason);
		shutdown("unhandledRejection");
	});
};

// Start the server
startServer().catch((error) => {
	console.error("Failed to start server:", error);
	process.exit(1);
});

export { server, io };
