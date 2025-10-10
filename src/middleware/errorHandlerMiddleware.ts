import type { NextFunction, Request, Response } from "express";
import { logger } from "../config/logger.js";
import type { AppError } from "../utils/errorUtils.js";
import { errorUtils, responseUtils } from "../utils/index.js";

const errorHandler = (
	err: Error,
	req: Request,
	res: Response,
	_next: NextFunction,
): void => {
	try {
		logger.error("Error occurred:", {
			message: err.message,
			stack: err.stack,
			url: req.url,
			method: req.method,
			userAgent: req.get("user-agent"),
			ip: req.ip,
			timestamp: new Date().toISOString(),
		});

		// Handle known AppError
		if (errorUtils.isOperationalError(err as AppError)) {
			const appError = err as AppError;
			res.status(appError.statusCode).json(
				responseUtils.errorResponse(appError.message, {
					type: "AppError",
					statusCode: appError.statusCode,
				}),
			);
			return;
		}

		// Handle Prisma errors
		if ((err as any).code === "P2002") {
			res.status(409).json(
				responseUtils.errorResponse("Resource already exists", {
					type: "PrismaError",
					code: (err as any).code,
				}),
			);
			return;
		}

		// Handle MongoDB errors
		if ((err as any).name === "MongoError") {
			const mongoError = err as any;
			if (mongoError.code === 11000) {
				res.status(409).json(
					responseUtils.errorResponse("Duplicate key error", {
						type: "MongoError",
						code: mongoError.code,
					}),
				);
				return;
			}
		}

		// Handle validation errors
		if (
			(err as any).name === "ValidationError" ||
			(err as any).name === "ZodError"
		) {
			res.status(400).json(
				responseUtils.errorResponse("Validation failed", {
					type: "ValidationError",
					details: (err as any).errors || (err as any).issues,
				}),
			);
			return;
		}

		// Handle JWT errors
		if ((err as any).name === "JsonWebTokenError") {
			res.status(401).json(
				responseUtils.errorResponse("Invalid token", {
					type: "JWTError",
				}),
			);
			return;
		}

		if ((err as any).name === "TokenExpiredError") {
			res.status(401).json(
				responseUtils.errorResponse("Token expired", {
					type: "JWTError",
				}),
			);
			return;
		}

		// Handle file upload errors
		if ((err as any).code === "LIMIT_FILE_SIZE") {
			res.status(413).json(
				responseUtils.errorResponse("File too large", {
					type: "UploadError",
					code: (err as any).code,
				}),
			);
			return;
		}

		// Handle rate limiting errors
		if ((err as any).status === 429) {
			res.status(429).json(
				responseUtils.errorResponse("Too many requests", {
					type: "RateLimitError",
				}),
			);
			return;
		}

		// Handle 404 errors
		if ((err as any).status === 404 || (err as any).statusCode === 404) {
			res.status(404).json(
				responseUtils.errorResponse("Resource not found", {
					type: "NotFoundError",
				}),
			);
			return;
		}

		// Handle unexpected errors
		logger.error("Unexpected error:", err);
		res.status(500).json(
			responseUtils.errorResponse(
				process.env.NODE_ENV === "development"
					? err.message
					: "Internal server error",
				{
					type: "UnexpectedError",
					...(process.env.NODE_ENV === "development" && { stack: err.stack }),
				},
			),
		);
	} catch (error) {
		logger.error("Error in error handler:", error);
		res.status(500).json({
			status: "error",
			message: "Internal server error",
			timestamp: new Date().toISOString(),
		});
	}
};

const notFoundHandler = (req: Request, res: Response): void => {
	logger.debug("404 Not Found:", {
		url: req.url,
		method: req.method,
		timestamp: new Date().toISOString(),
	});

	res.status(404).json(
		responseUtils.errorResponse("Route not found", {
			type: "NotFoundError",
			path: req.path,
			method: req.method,
		}),
	);
};

const asyncHandler = (fn: Function) => {
	return (req: Request, res: Response, next: NextFunction) => {
		Promise.resolve(fn(req, res, next)).catch(next);
	};
};

const errorHandlerMiddleware = {
	errorHandler,
	notFoundHandler,
	asyncHandler,
};

export default errorHandlerMiddleware;
