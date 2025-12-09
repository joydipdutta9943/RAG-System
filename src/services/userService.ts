import type { Prisma, PrismaClient, Role as PrismaRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { logger } from "../config/logger.js";
import userRepository from "../repositories/userRepository.js";
import type { TokenPayload } from "../types/authTypes.js";
import type {
	LoginCredentials,
	RegisterData,
	UserCreateData,
	UserResponse,
	UserUpdateData,
} from "../types/userTypes.js";
import { SECURITY_CONFIG } from "../utils/constantUtils.js";
import { errorUtils, helperUtils, validatorUtils } from "../utils/index.js";

type UserDelegate = PrismaClient["user"];

const createUser = async (
	userData: UserCreateData,
	userCollection: UserDelegate,
): Promise<UserResponse> => {
	try {
		// Validate input
		const validation = validatorUtils.validateCreateUser(userData);
		if (!validation.success) {
			throw errorUtils.createValidationError(
				validatorUtils.formatZodError(validation.error)[0].message,
			);
		}

		// Check if user already exists
		const existingUser = await userRepository.findByEmail(
			userCollection,
			userData.email,
		);
		if (existingUser) {
			throw errorUtils.createValidationError(
				"User with this email already exists",
			);
		}

		// Hash password
		const hashedPassword = await bcrypt.hash(
			userData.password,
			SECURITY_CONFIG.BCRYPT_ROUNDS,
		);

		// Create user
		const user = await userRepository.createWithHashedPassword(
			userCollection,
			userData,
			hashedPassword,
		);

		// Return user response without password
		return {
			id: user.id,
			name: user.name,
			email: user.email,
			role: user.role,
			isActive: user.isActive ?? true,
			createdAt: user.createdAt,
			updatedAt: user.updatedAt,
		};
	} catch (error) {
		logger.error("Error creating user:", error);
		throw errorUtils.isOperationalError(error)
			? error
			: errorUtils.createError("Failed to create user");
	}
};

const getUserById = async (
	userId: string,
	userCollection: UserDelegate,
): Promise<UserResponse | null> => {
	try {
		const user = await userRepository.findById(userCollection, userId);
		if (!user) {
			return null;
		}

		return {
			id: user.id,
			name: user.name,
			email: user.email,
			role: user.role,
			isActive: user.isActive ?? true,
			createdAt: user.createdAt,
			updatedAt: user.updatedAt,
		};
	} catch (error) {
		logger.error("Error getting user by ID:", error);
		throw errorUtils.isOperationalError(error)
			? error
			: errorUtils.createError("Failed to get user");
	}
};

const getUserByEmail = async (
	email: string,
	userCollection: UserDelegate,
): Promise<UserResponse | null> => {
	try {
		const user = await userRepository.findByEmail(userCollection, email);
		if (!user) {
			return null;
		}

		return {
			id: user.id,
			name: user.name,
			email: user.email,
			role: user.role,
			isActive: user.isActive ?? true,
			createdAt: user.createdAt,
			updatedAt: user.updatedAt,
		};
	} catch (error) {
		logger.error("Error getting user by email:", error);
		throw errorUtils.isOperationalError(error)
			? error
			: errorUtils.createError("Failed to get user by email");
	}
};

const updateUser = async (
	userId: string,
	updateData: UserUpdateData,
	userCollection: UserDelegate,
): Promise<UserResponse> => {
	try {
		// Validate input
		const validation = validatorUtils.validateUpdateUser(updateData);
		if (!validation.success) {
			throw errorUtils.createValidationError(
				validatorUtils.formatZodError(validation.error)[0].message,
			);
		}

		// Check if user exists
		const existingUser = await userRepository.findById(userCollection, userId);
		if (!existingUser) {
			throw errorUtils.createNotFoundError("User not found");
		}

		// Hash password if provided
		let finalUpdateData = { ...updateData };
		if (updateData.password) {
			finalUpdateData = {
				...updateData,
				password: await bcrypt.hash(
					updateData.password,
					SECURITY_CONFIG.BCRYPT_ROUNDS,
				),
			};
		}

		// Update user
		const updatedUser = await userRepository.updateById(
			userCollection,
			userId,
			finalUpdateData,
		);

		return {
			id: updatedUser.id,
			name: updatedUser.name,
			email: updatedUser.email,
			role: updatedUser.role,
			isActive: updatedUser.isActive ?? true,
			createdAt: updatedUser.createdAt,
			updatedAt: updatedUser.updatedAt,
		};
	} catch (error) {
		logger.error("Error updating user:", error);
		throw errorUtils.isOperationalError(error)
			? error
			: errorUtils.createError("Failed to update user");
	}
};

const deleteUser = async (
	userId: string,
	userCollection: UserDelegate,
): Promise<boolean> => {
	try {
		const existingUser = await userRepository.findById(userCollection, userId);
		if (!existingUser) {
			throw errorUtils.createNotFoundError("User not found");
		}

		return await userRepository.deleteById(userCollection, userId);
	} catch (error) {
		logger.error("Error deleting user:", error);
		throw errorUtils.isOperationalError(error)
			? error
			: errorUtils.createError("Failed to delete user");
	}
};

const getAllUsers = async (
	userCollection: UserDelegate,
	options: { page?: number; limit?: number; role?: string } = {},
): Promise<{
	users: UserResponse[];
	total: number;
	page: number;
	totalPages: number;
}> => {
	try {
		const { page = 1, limit = 10, role } = options;
		const { offset } = helperUtils.calculatePagination(page, limit);

		// Build query
		const query: Prisma.UserWhereInput = {};
		if (role) {
			query.role = role as PrismaRole;
		}

		// Get users
		const users = await userRepository.findMany(userCollection, query, {
			skip: offset,
			take: limit,
			orderBy: { createdAt: "desc" },
		});

		// Get total count
		const total = await userRepository.count(userCollection, query);
		const totalPages = Math.ceil(total / limit);

		const userResponses: UserResponse[] = users.map((user) => ({
			id: user.id,
			name: user.name,
			email: user.email,
			role: user.role,
			isActive: user.isActive ?? true,
			createdAt: user.createdAt,
			updatedAt: user.updatedAt,
		}));

		return {
			users: userResponses,
			total,
			page,
			totalPages,
		};
	} catch (error) {
		logger.error("Error getting all users:", error);
		throw errorUtils.isOperationalError(error)
			? error
			: errorUtils.createError("Failed to get users");
	}
};

const authenticateUser = async (
	credentials: LoginCredentials,
	userCollection: UserDelegate,
): Promise<UserResponse> => {
	try {
		// Validate input
		const validation = validatorUtils.validateLogin(credentials);
		if (!validation.success) {
			throw errorUtils.createValidationError(
				validatorUtils.formatZodError(validation.error)[0].message,
			);
		}

		// Find user by email
		const user = await userRepository.findByEmail(
			userCollection,
			credentials.email,
		);
		if (!user) {
			throw errorUtils.createAuthenticationError("Invalid email or password");
		}

		// Check if user is active
		if (user.isActive === false) {
			throw errorUtils.createAuthenticationError("Account is deactivated");
		}

		// Verify password
		const isPasswordValid = await bcrypt.compare(
			credentials.password,
			user.password,
		);
		if (!isPasswordValid) {
			throw errorUtils.createAuthenticationError("Invalid email or password");
		}

		const userResponse: UserResponse = {
			id: user.id,
			name: user.name,
			email: user.email,
			role: user.role,
			isActive: user.isActive ?? true,
			createdAt: user.createdAt,
			updatedAt: user.updatedAt,
		};

		logger.info(`User authenticated successfully: ${user.email}`);
		return userResponse;
	} catch (error) {
		logger.error("Error during authentication:", error);
		throw errorUtils.isOperationalError(error)
			? error
			: errorUtils.createError("Authentication failed");
	}
};

const registerUser = async (
	registerData: RegisterData,
	userCollection: UserDelegate,
): Promise<UserResponse> => {
	try {
		// Validate input
		const validation = validatorUtils.validateRegister(registerData);
		if (!validation.success) {
			throw errorUtils.createValidationError(
				validatorUtils.formatZodError(validation.error)[0].message,
			);
		}

		// Check if passwords match
		if (registerData.password !== registerData.confirmPassword) {
			throw errorUtils.createValidationError("Passwords do not match");
		}

		// Create user data
		const userData: UserCreateData = {
			name: registerData.name,
			email: registerData.email,
			password: registerData.password,
			role: registerData.role || "USER",
		};

		// Create user
		const user = await createUser(userData, userCollection);

		logger.info(`User registered successfully: ${user.email}`);
		return user;
	} catch (error) {
		logger.error("Error during registration:", error);
		throw errorUtils.isOperationalError(error)
			? error
			: errorUtils.createError("Registration failed");
	}
};

const generateToken = (payload: {
	id: string;
	email: string;
	role: string;
}): string => {
	const options: jwt.SignOptions = {
		expiresIn: SECURITY_CONFIG.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
	};
	return jwt.sign(payload, SECURITY_CONFIG.JWT_SECRET, options);
};

const verifyToken = (token: string): TokenPayload => {
	try {
		return jwt.verify(token, SECURITY_CONFIG.JWT_SECRET) as TokenPayload;
	} catch (_error) {
		throw errorUtils.createAuthenticationError("Invalid or expired token");
	}
};

const validateUserData = (
	userData: UserCreateData,
): { isValid: boolean; errors: string[] } => {
	const errors: string[] = [];

	// Validate email format
	if (!helperUtils.validateEmail(userData.email)) {
		errors.push("Invalid email format");
	}

	// Validate password strength
	if (userData.password.length < 8) {
		errors.push("Password must be at least 8 characters long");
	}

	// Validate name
	if (userData.name.length < 2) {
		errors.push("Name must be at least 2 characters long");
	}

	return {
		isValid: errors.length === 0,
		errors,
	};
};

const changePassword = async (
	userId: string,
	currentPassword: string,
	newPassword: string,
	userCollection: UserDelegate,
): Promise<void> => {
	try {
		// Get user
		const user = await userRepository.findById(userCollection, userId);
		if (!user) {
			throw errorUtils.createNotFoundError("User not found");
		}

		// Verify current password
		const isCurrentPasswordValid = await bcrypt.compare(
			currentPassword,
			user.password,
		);
		if (!isCurrentPasswordValid) {
			throw errorUtils.createAuthenticationError(
				"Current password is incorrect",
			);
		}

		// Hash new password
		const hashedNewPassword = await bcrypt.hash(
			newPassword,
			SECURITY_CONFIG.BCRYPT_ROUNDS,
		);

		// Update password
		await userRepository.updatePassword(
			userCollection,
			userId,
			hashedNewPassword,
		);

		logger.info(`Password changed successfully for user: ${user.email}`);
	} catch (error) {
		logger.error("Error changing password:", error);
		throw errorUtils.isOperationalError(error)
			? error
			: errorUtils.createError("Failed to change password");
	}
};

const userService = {
	createUser,
	getUserById,
	getUserByEmail,
	updateUser,
	deleteUser,
	getAllUsers,
	authenticateUser,
	registerUser,
	generateToken,
	verifyToken,
	validateUserData,
	changePassword,
};

export default userService;
