export interface AppError extends Error {
	statusCode: number;
	isOperational: boolean;
}

const createError = (message: string, statusCode: number = 500): AppError => {
	const error = new Error(message) as AppError;
	error.statusCode = statusCode;
	error.isOperational = true;
	return error;
};

const createValidationError = (message: string): AppError => {
	return createError(message, 400);
};

const createAuthenticationError = (
	message: string = "Authentication required",
): AppError => {
	return createError(message, 401);
};

const createAuthorizationError = (
	message: string = "Insufficient permissions",
): AppError => {
	return createError(message, 403);
};

const createNotFoundError = (
	message: string = "Resource not found",
): AppError => {
	return createError(message, 404);
};

const isOperationalError = (error: any): boolean => {
	return error && error.isOperational === true;
};

const handleError = (error: any, logger?: any): void => {
	if (logger) {
		logger.error("Application error:", {
			message: error.message,
			stack: error.stack,
			statusCode: error.statusCode,
		});
	}

	// Re-throw operational errors
	if (isOperationalError(error)) {
		throw error;
	}

	// Wrap non-operational errors
	throw createError("An unexpected error occurred", 500);
};

const errorUtils = {
	createError,
	createValidationError,
	createAuthenticationError,
	createAuthorizationError,
	createNotFoundError,
	isOperationalError,
	handleError,
};

export default errorUtils;
