import type { NextFunction, Request, Response } from "express";
import { logger } from "../config/logger.js";
import userService from "../services/userService.js";
import type {
	AuthenticatedRequest,
	AuthMiddlewareOptions,
} from "../types/authTypes.js";
import { errorUtils } from "../utils/index.js";

const authenticateCookie = (
	req: AuthenticatedRequest,
	_res: Response,
	next: NextFunction,
): void => {
	try {
		const token = req.cookies?.token;

		if (!token) {
			throw errorUtils.createAuthenticationError("Authentication required");
		}

		const decoded = userService.verifyToken(token);
		req.user = {
			id: decoded.id,
			email: decoded.email,
			role: decoded.role,
		};

		next();
	} catch (error) {
		logger.error("Authentication error:", error);
		next(error);
	}
};

const authorizeRoles = (roles: string[]) => {
	return (
		req: AuthenticatedRequest,
		_res: Response,
		next: NextFunction,
	): void => {
		try {
			if (!req.user) {
				throw errorUtils.createAuthenticationError("User not authenticated");
			}

			if (!roles.includes(req.user.role)) {
				throw errorUtils.createAuthorizationError("Insufficient permissions");
			}

			next();
		} catch (error) {
			logger.error("Authorization error:", error);
			next(error);
		}
	};
};

const validateApiKey = (
	req: Request,
	_res: Response,
	next: NextFunction,
): void => {
	try {
		const apiKey = req.headers["x-api-key"] as string;

		if (!apiKey) {
			throw errorUtils.createAuthenticationError("API key required");
		}

		// In a real implementation, validate the API key against database
		// For now, just check if it exists and is not empty
		if (apiKey.length < 10) {
			throw errorUtils.createAuthenticationError("Invalid API key");
		}

		next();
	} catch (error) {
		logger.error("API key validation error:", error);
		next(error);
	}
};

const optionalAuth = (
	req: AuthenticatedRequest,
	_res: Response,
	next: NextFunction,
): void => {
	try {
		const token = req.cookies?.token;

		if (token) {
			try {
				const decoded = userService.verifyToken(token);
				req.user = {
					id: decoded.id,
					email: decoded.email,
					role: decoded.role,
				};
			} catch (_error) {
				// Token is invalid, but we continue without authentication
				logger.debug(
					"Invalid optional auth cookie, continuing unauthenticated",
				);
			}
		}

		next();
	} catch (error) {
		logger.error("Optional authentication error:", error);
		next(error);
	}
};

const createAuthMiddleware = (options: AuthMiddlewareOptions = {}) => {
	const { requireAuth = true, allowedRoles, allowApiKeys = false } = options;

	return (
		req: AuthenticatedRequest,
		res: Response,
		next: NextFunction,
	): void => {
		try {
			// Skip authentication if not required
			if (!requireAuth) {
				optionalAuth(req, res, next);
				return;
			}

			// Check for API key if allowed
			if (allowApiKeys && req.headers["x-api-key"]) {
				validateApiKey(req, res, (err) => {
					if (err) {
						next(err);
						return;
					}
					next();
				});
				return;
			}

			// Standard cookie authentication
			authenticateCookie(req, res, (err) => {
				if (err) {
					next(err);
					return;
				}

				// Check role-based authorization if roles are specified
				if (allowedRoles && allowedRoles.length > 0) {
					authorizeRoles(allowedRoles)(req, res, next);
					return;
				}

				next();
			});
		} catch (error) {
			logger.error("Auth middleware error:", error);
			next(error);
		}
	};
};

const requireAuth = createAuthMiddleware({ requireAuth: true });
const requireAdmin = createAuthMiddleware({
	requireAuth: true,
	allowedRoles: ["ADMIN"],
});
const requireModeratorOrAdmin = createAuthMiddleware({
	requireAuth: true,
	allowedRoles: ["ADMIN", "MODERATOR"],
});
const optionalAuthMiddleware = createAuthMiddleware({ requireAuth: false });
const apiKeyAuth = createAuthMiddleware({
	requireAuth: true,
	allowApiKeys: true,
});

const authMiddleware = {
	authenticateCookie,
	authorizeRoles,
	validateApiKey,
	optionalAuth,
	createAuthMiddleware,
	requireAuth,
	requireAdmin,
	requireModeratorOrAdmin,
	optionalAuthMiddleware,
	apiKeyAuth,
};

export default authMiddleware;
