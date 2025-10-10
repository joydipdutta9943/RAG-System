import crypto from "node:crypto";

const generateId = (): string => crypto.randomUUID();

const generateTimestamp = (): string => new Date().toISOString();

const sanitizeInput = (input: string): string => {
	return input.trim().replace(/[<>]/g, "");
};

const validateEmail = (email: string): boolean => {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email);
};

const calculatePagination = (page: number, limit: number) => {
	const offset = (page - 1) * limit;
	return { offset, limit };
};

const formatBytes = (bytes: number, decimals = 2): string => {
	if (bytes === 0) return "0 Bytes";

	const k = 1024;
	const dm = decimals < 0 ? 0 : decimals;
	const sizes = ["Bytes", "KB", "MB", "GB", "TB"];

	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return `${parseFloat((bytes / k ** i).toFixed(dm))} ${sizes[i]}`;
};

const helperUtils = {
	generateId,
	generateTimestamp,
	sanitizeInput,
	validateEmail,
	calculatePagination,
	formatBytes,
};

export default helperUtils;
