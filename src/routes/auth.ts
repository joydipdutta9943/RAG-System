import express from "express";
import { body } from "express-validator";
import { authController } from "../controllers/index.js";
import authMiddleware from "../middleware/authMiddleware.js";
import { rateLimitMiddleware } from "../middleware/index.js";

const router = express.Router();

// Apply auth rate limiting to all routes
router.use(rateLimitMiddleware.authRateLimit);

// Register
router.post(
	"/register",
	[
		body("email").isEmail().normalizeEmail(),
		body("password")
			.isLength({ min: 8 })
			.withMessage("Password must be at least 8 characters"),
		body("name")
			.trim()
			.isLength({ min: 2 })
			.withMessage("Name must be at least 2 characters"),
	],
	authController.registerHandler,
);

// Login
router.post(
	"/login",
	[
		body("email").isEmail().normalizeEmail(),
		body("password").notEmpty().withMessage("Password is required"),
	],
	authController.loginHandler,
);

// Get current user profile (protected)
router.get(
	"/profile",
	authMiddleware.requireAuth,
	authController.getProfileHandler,
);

// Logout
router.post("/logout", authController.logoutHandler);

export default router;
