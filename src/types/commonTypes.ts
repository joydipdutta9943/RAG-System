export interface ApiResponse<T = any> {
	status: "success" | "error";
	message: string;
	data?: T;
	error?: any;
	timestamp: string;
}

export interface PaginatedResponse<T> {
	items: T[];
	total: number;
	page: number;
	limit: number;
	totalPages: number;
}

export interface PaginationOptions {
	page: number;
	limit: number;
}

export interface SortOptions {
	field: string;
	order: "asc" | "desc";
}

export interface FilterOptions {
	[key: string]: any;
}

export interface DatabaseConfig {
	url: string;
	name: string;
	options?: any;
}

export interface RedisConfig {
	url: string;
	password?: string;
	db?: number;
}

export interface AppConfig {
	nodeEnv: "development" | "production" | "test";
	port: number;
	database: DatabaseConfig;
	redis: RedisConfig;
	jwt: {
		secret: string;
		expiresIn: string;
	};
	upload: {
		maxSize: number;
		allowedTypes: string[];
		maxFiles: number;
	};
}

export interface LoggerConfig {
	level: "debug" | "info" | "warn" | "error";
	format: "json" | "simple";
	enableConsole: boolean;
	enableFile: boolean;
}

export interface SystemMetrics {
	memory: {
		total: number;
		used: number;
		free: number;
	};
	cpu: {
		usage: number;
	};
	uptime: number;
	timestamp: Date;
}

export interface HealthCheck {
	status: "healthy" | "unhealthy";
	timestamp: string;
	version: string;
	checks: {
		database: boolean;
		redis: boolean;
		vectorSearch: boolean;
	};
	metrics?: SystemMetrics;
}
