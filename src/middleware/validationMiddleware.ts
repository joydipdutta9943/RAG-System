import type { NextFunction, Request, Response } from "express";
import { logger } from "../config/logger.js";
import { validatorUtils } from "../utils/index.js";

const validateRequest = <_T>(schema: {
	safeParse: (data: unknown) => { success: boolean; error?: any };
}) => {
	return (req: Request, res: Response, next: NextFunction): void => {
		try {
			const validation = schema.safeParse(req.body);

			if (!validation.success) {
				const errors = validatorUtils.formatZodError(validation.error);
				logger.debug("Validation error:", errors);

				res.status(400).json({
					status: "error",
					message: "Validation failed",
					errors,
					timestamp: new Date().toISOString(),
				});
				return;
			}

			// Replace request body with validated data
			if (validation.success && "data" in validation) {
				req.body = (validation as any).data;
			}
			next();
		} catch (error) {
			logger.error("Validation middleware error:", error);
			next(error);
		}
	};
};

const validateParams = (schema: {
	safeParse: (data: unknown) => { success: boolean; error?: any };
}) => {
	return (req: Request, res: Response, next: NextFunction): void => {
		try {
			const validation = schema.safeParse(req.params);

			if (!validation.success) {
				const errors = validatorUtils.formatZodError(validation.error);
				logger.debug("Parameter validation error:", errors);

				res.status(400).json({
					status: "error",
					message: "Parameter validation failed",
					errors,
					timestamp: new Date().toISOString(),
				});
				return;
			}

			// Replace request params with validated data
			if (validation.success && "data" in validation) {
				req.params = (validation as any).data;
			}
			next();
		} catch (error) {
			logger.error("Parameter validation middleware error:", error);
			next(error);
		}
	};
};

const validateQuery = (schema: {
	safeParse: (data: unknown) => { success: boolean; error?: any };
}) => {
	return (req: Request, res: Response, next: NextFunction): void => {
		try {
			const validation = schema.safeParse(req.query);

			if (!validation.success) {
				const errors = validatorUtils.formatZodError(validation.error);
				logger.debug("Query validation error:", errors);

				res.status(400).json({
					status: "error",
					message: "Query validation failed",
					errors,
					timestamp: new Date().toISOString(),
				});
				return;
			}

			// Replace request query with validated data
			if (validation.success && "data" in validation) {
				req.query = (validation as any).data;
			}
			next();
		} catch (error) {
			logger.error("Query validation middleware error:", error);
			next(error);
		}
	};
};

// Common validation schemas for middleware
const idParamSchema = {
	safeParse: (data: unknown) => {
		if (typeof data !== "object" || data === null) {
			return { success: false, error: [{ message: "Invalid params object" }] };
		}

		const { id } = data as any;
		if (!id || typeof id !== "string") {
			return {
				success: false,
				error: [{ message: "ID is required and must be a string" }],
			};
		}

		return { success: true, data: { id } };
	},
};

const paginationQuerySchema = {
	safeParse: (data: unknown) => {
		if (typeof data !== "object" || data === null) {
			return { success: false, error: [{ message: "Invalid query object" }] };
		}

		const { page, limit } = data as any;
		const result: any = {};

		if (page !== undefined) {
			if (typeof page !== "number" || page < 1) {
				return {
					success: false,
					error: [{ message: "Page must be a positive number" }],
				};
			}
			result.page = page;
		}

		if (limit !== undefined) {
			if (typeof limit !== "number" || limit < 1 || limit > 100) {
				return {
					success: false,
					error: [{ message: "Limit must be a number between 1 and 100" }],
				};
			}
			result.limit = limit;
		}

		return { success: true, data: result };
	},
};

// Create schema wrappers that conform to the expected interface
const createUserSchemaWrapper = {
	safeParse: validatorUtils.validateCreateUser,
};
const updateUserSchemaWrapper = {
	safeParse: validatorUtils.validateUpdateUser,
};
const createDocumentSchemaWrapper = {
	safeParse: validatorUtils.validateCreateDocument,
};
const updateDocumentSchemaWrapper = {
	safeParse: validatorUtils.validateUpdateDocument,
};
const searchSchemaWrapper = {
	safeParse: validatorUtils.validateSearch,
};
const loginSchemaWrapper = {
	safeParse: validatorUtils.validateLogin,
};
const registerSchemaWrapper = {
	safeParse: validatorUtils.validateRegister,
};

// Pre-configured validation middlewares
const validateCreateUser = validateRequest(createUserSchemaWrapper);
const validateUpdateUser = validateRequest(updateUserSchemaWrapper);
const validateCreateDocument = validateRequest(createDocumentSchemaWrapper);
const validateUpdateDocument = validateRequest(updateDocumentSchemaWrapper);
const validateSearch = validateRequest(searchSchemaWrapper);
const validateLogin = validateRequest(loginSchemaWrapper);
const validateRegister = validateRequest(registerSchemaWrapper);
const validateIdParam = validateParams(idParamSchema);
const validatePaginationQuery = validateQuery(paginationQuerySchema);

const validationMiddleware = {
	validateRequest,
	validateParams,
	validateQuery,
	validateCreateUser,
	validateUpdateUser,
	validateCreateDocument,
	validateUpdateDocument,
	validateSearch,
	validateLogin,
	validateRegister,
	validateIdParam,
	validatePaginationQuery,
};

export default validationMiddleware;
