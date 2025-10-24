import bcrypt from "bcryptjs";
import type express from "express";
import { validationResult } from "express-validator";
import { prisma } from "../config/database.js";
import { logger } from "../config/logger.js";
import { userService } from "../services/index.js";
import type { TokenPayload } from "../types/authTypes.js";
import { COOKIE_CONFIG } from "../utils/constantUtils.js";

const registerHandler = async (
	req: express.Request,
	res: express.Response,
): Promise<express.Response> => {
	try {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ errors: errors.array() });
		}

		const { email, password, name } = req.body;

		// Check if user already exists
		const existingUser = await prisma.user.findUnique({
			where: { email },
		});

		if (existingUser) {
			return res
				.status(400)
				.json({ error: "User already exists with this email" });
		}

		// Hash password and create user
		const hashedPassword = await bcrypt.hash(password, 10);
		const user = await prisma.user.create({
			data: {
				email,
				password: hashedPassword,
				name,
				role: "USER",
			},
			select: {
				id: true,
				email: true,
				name: true,
				role: true,
				createdAt: true,
			},
		});

		// Generate token using userService
		const token = userService.generateToken({
			id: user.id,
			email: user.email,
			role: user.role,
		});

		// Set HTTP-only cookie
		res.cookie(COOKIE_CONFIG.NAME, token, {
			maxAge: COOKIE_CONFIG.MAX_AGE,
			httpOnly: COOKIE_CONFIG.HTTP_ONLY,
			secure: COOKIE_CONFIG.SECURE,
			sameSite: COOKIE_CONFIG.SAME_SITE,
			path: COOKIE_CONFIG.PATH,
			domain: COOKIE_CONFIG.DOMAIN,
		});

		logger.info(`New user registered: ${email}`);

		return res.status(201).json({
			message: "User registered successfully",
			user,
		});
	} catch (error) {
		logger.error("Registration error:", error);
		return res.status(500).json({ error: "Internal server error" });
	}
};

const loginHandler = async (
	req: express.Request,
	res: express.Response,
): Promise<express.Response> => {
	try {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ errors: errors.array() });
		}

		const { email, password } = req.body;

		// Find user
		const user = await prisma.user.findUnique({
			where: { email },
		});

		if (!user) {
			return res.status(401).json({ error: "Invalid credentials" });
		}

		// Verify password using bcrypt
		const isValidPassword = await bcrypt.compare(password, user.password);
		if (!isValidPassword) {
			return res.status(401).json({ error: "Invalid credentials" });
		}

		// Generate token using userService
		const token = userService.generateToken({
			id: user.id,
			email: user.email,
			role: user.role,
		});

		// Set HTTP-only cookie
		res.cookie(COOKIE_CONFIG.NAME, token, {
			maxAge: COOKIE_CONFIG.MAX_AGE,
			httpOnly: COOKIE_CONFIG.HTTP_ONLY,
			secure: COOKIE_CONFIG.SECURE,
			sameSite: COOKIE_CONFIG.SAME_SITE,
			path: COOKIE_CONFIG.PATH,
			domain: COOKIE_CONFIG.DOMAIN,
		});

		logger.info(`User logged in: ${email}`);

		return res.json({
			message: "Login successful",
			user: {
				id: user.id,
				email: user.email,
				name: user.name,
				role: user.role,
			},
		});
	} catch (error) {
		logger.error("Login error:", error);
		return res.status(500).json({ error: "Internal server error" });
	}
};

const getProfileHandler = async (
	req: express.Request,
	res: express.Response,
): Promise<express.Response> => {
	try {
		const token = req.cookies?.token;

		if (!token) {
			return res.status(401).json({ error: "Authentication required" });
		}

		// Verify JWT token using userService
		const decoded = userService.verifyToken(token) as TokenPayload;
		if (!decoded || !decoded.id) {
			return res.status(401).json({ error: "Invalid session" });
		}

		// Fetch user profile
		const user = await prisma.user.findUnique({
			where: { id: decoded.id },
			select: {
				id: true,
				email: true,
				name: true,
				role: true,
				createdAt: true,
				_count: {
					select: {
						documents: true,
						queries: true,
					},
				},
			},
		});

		if (!user) {
			return res.status(404).json({ error: "User not found" });
		}

		return res.json({ user });
	} catch (error) {
		logger.error("Profile fetch error:", error);
		if (
			error instanceof Error &&
			error.message.includes("Invalid or expired token")
		) {
			return res.status(401).json({ error: "Invalid session" });
		}
		return res.status(500).json({ error: "Internal server error" });
	}
};

const logoutHandler = async (
	req: express.Request,
	res: express.Response,
): Promise<express.Response> => {
	try {
		// Clear the cookie
		res.clearCookie(COOKIE_CONFIG.NAME, {
			httpOnly: COOKIE_CONFIG.HTTP_ONLY,
			secure: COOKIE_CONFIG.SECURE,
			sameSite: COOKIE_CONFIG.SAME_SITE,
			path: COOKIE_CONFIG.PATH,
			domain: COOKIE_CONFIG.DOMAIN,
		});

		logger.info("User logged out successfully");

		return res.json({ message: "Logout successful" });
	} catch (error) {
		logger.error("Logout error:", error);
		return res.status(500).json({ error: "Internal server error" });
	}
};

const authController = {
	registerHandler,
	loginHandler,
	getProfileHandler,
	logoutHandler,
};

export default authController;
