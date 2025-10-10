import { z } from "zod";

// User validation schemas
export const createUserSchema = z.object({
	name: z.string().min(2, "Name must be at least 2 characters").max(100),
	email: z.string().email("Invalid email format"),
	password: z.string().min(8, "Password must be at least 8 characters"),
	role: z.enum(["USER", "ADMIN", "MODERATOR"]).optional().default("USER"),
});

export const updateUserSchema = z
	.object({
		name: z.string().min(2).max(100).optional(),
		email: z.string().email().optional(),
		role: z.enum(["USER", "ADMIN", "MODERATOR"]).optional(),
	})
	.refine((data) => Object.keys(data).length > 0, {
		message: "At least one field must be provided for update",
	});

// Document validation schemas
export const createDocumentSchema = z.object({
	title: z.string().min(1, "Title is required").max(200),
	content: z.string().min(1, "Content is required"),
	fileType: z.string().min(1),
	fileSize: z.number().positive("File size must be positive"),
	metadata: z.record(z.any()).optional(),
});

export const updateDocumentSchema = z
	.object({
		title: z.string().min(1).max(200).optional(),
		content: z.string().min(1).optional(),
		metadata: z.record(z.any()).optional(),
	})
	.refine((data) => Object.keys(data).length > 0, {
		message: "At least one field must be provided for update",
	});

// Search validation schemas
export const searchSchema = z.object({
	query: z.string().min(1, "Search query is required").max(1000),
	limit: z.number().int().min(1).max(100).optional().default(10),
	page: z.number().int().min(1).optional().default(1),
	filter: z.record(z.any()).optional(),
	searchType: z.enum(["vector", "hybrid", "text"]).optional().default("hybrid"),
});

// Auth validation schemas
export const loginSchema = z.object({
	email: z.string().email("Invalid email format"),
	password: z.string().min(1, "Password is required"),
});

export const registerSchema = createUserSchema
	.extend({
		confirmPassword: z.string(),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "Passwords do not match",
		path: ["confirmPassword"],
	});

// Type definitions
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
export type SearchInput = z.infer<typeof searchSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

// Validation functions
const validateCreateUser = (data: unknown) => {
	return createUserSchema.safeParse(data);
};

const validateUpdateUser = (data: unknown) => {
	return updateUserSchema.safeParse(data);
};

const validateCreateDocument = (data: unknown) => {
	return createDocumentSchema.safeParse(data);
};

const validateUpdateDocument = (data: unknown) => {
	return updateDocumentSchema.safeParse(data);
};

const validateSearch = (data: unknown) => {
	return searchSchema.safeParse(data);
};

const validateLogin = (data: unknown) => {
	return loginSchema.safeParse(data);
};

const validateRegister = (data: unknown) => {
	return registerSchema.safeParse(data);
};

// Error formatting
const formatZodError = (error: z.ZodError) => {
	return error.errors.map((err) => ({
		field: err.path.join("."),
		message: err.message,
	}));
};

const validatorUtils = {
	validateCreateUser,
	validateUpdateUser,
	validateCreateDocument,
	validateUpdateDocument,
	validateSearch,
	validateLogin,
	validateRegister,
	formatZodError,
};

export default validatorUtils;
