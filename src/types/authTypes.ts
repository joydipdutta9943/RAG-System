import type { Request } from "express";
import type { UserRole } from "./userTypes.js";

export interface AuthenticatedRequest extends Request {
	user?: {
		id: string;
		email: string;
		role: UserRole;
	};
}

export interface TokenPayload {
	id: string;
	email: string;
	role: UserRole;
	iat?: number;
	exp?: number;
}

export interface LoginRequest {
	email: string;
	password: string;
}

export interface RegisterRequest {
	name: string;
	email: string;
	password: string;
	confirmPassword: string;
	role?: UserRole;
}

export interface AuthResponse {
	user: {
		id: string;
		email: string;
		name: string;
		role: UserRole;
	};
}

export interface RefreshTokenRequest {
	refreshToken: string;
}

export interface PasswordResetRequest {
	email: string;
}

export interface PasswordUpdateRequest {
	currentPassword: string;
	newPassword: string;
	confirmPassword: string;
}

export interface ChangePasswordRequest {
	currentPassword: string;
	newPassword: string;
	confirmPassword: string;
}

export interface AuthMiddlewareOptions {
	requireAuth?: boolean;
	allowedRoles?: UserRole[];
	allowApiKeys?: boolean;
}
