export interface User {
	id: string;
	name: string;
	email: string;
	password: string;
	role: UserRole;
	isActive?: boolean;
	createdAt: Date;
	updatedAt: Date;
}

export interface UserCreateData {
	name: string;
	email: string;
	password: string;
	role?: UserRole;
}

export interface UserUpdateData {
	name?: string;
	email?: string;
	password?: string;
	role?: UserRole;
	isActive?: boolean;
}

export interface UserResponse {
	id: string;
	name: string;
	email: string;
	role: UserRole;
	isActive: boolean;
	createdAt: Date;
	updatedAt: Date;
}

export interface LoginCredentials {
	email: string;
	password: string;
}

export interface RegisterData {
	name: string;
	email: string;
	password: string;
	confirmPassword: string;
	role?: UserRole;
}

export type UserRole = "USER" | "ADMIN" | "MODERATOR";

export interface UserProfile {
	id: string;
	name: string;
	email: string;
	role: UserRole;
	isActive: boolean;
	createdAt: Date;
	documentCount?: number;
	lastActiveAt?: Date;
}
