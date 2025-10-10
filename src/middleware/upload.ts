import fs from "node:fs/promises";
import path from "node:path";
import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { logger } from "../config/logger.js";

// Ensure upload directories exist
const ensureUploadDirs = async () => {
	const dirs = [
		"./uploads",
		"./uploads/documents",
		"./uploads/images",
		"./uploads/extracted",
	];

	for (const dir of dirs) {
		try {
			await fs.access(dir);
		} catch {
			await fs.mkdir(dir, { recursive: true });
			logger.info(`Created upload directory: ${dir}`);
		}
	}
};

// Storage configuration
const createStorage = () => {
	return multer.diskStorage({
		destination: async (_req, file, cb) => {
			try {
				const isImage = file.mimetype.startsWith("image/");
				const uploadPath = isImage ? "./uploads/images" : "./uploads/documents";
				cb(null, uploadPath);
			} catch (error) {
				cb(error as Error, "./uploads");
			}
		},
		filename: (_req, file, cb) => {
			// Generate unique filename with timestamp
			const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
			const ext = path.extname(file.originalname);
			const name = path.basename(file.originalname, ext);
			cb(null, `${name}-${uniqueSuffix}${ext}`);
		},
	});
};

// File filter
const createFileFilter = () => {
	return (
		_req: Request,
		file: Express.Multer.File,
		cb: multer.FileFilterCallback,
	) => {
		const allowedMimeTypes = [
			"application/pdf",
			"text/plain",
			"image/jpeg",
			"image/jpg",
			"image/png",
			"image/gif",
			"image/bmp",
			"image/webp",
			"image/svg+xml",
		];

		const allowedExtensions = [
			".pdf",
			".txt",
			".jpg",
			".jpeg",
			".png",
			".gif",
			".bmp",
			".webp",
			".svg",
		];
		const fileExtension = path.extname(file.originalname).toLowerCase();

		if (
			allowedMimeTypes.includes(file.mimetype) &&
			allowedExtensions.includes(fileExtension)
		) {
			cb(null, true);
		} else {
			cb(
				new Error(
					`Unsupported file type: ${file.mimetype}. Allowed types: ${allowedMimeTypes.join(", ")}`,
				),
			);
		}
	};
};

// Create upload middleware
const createUploadMiddleware = (options: {
	maxFiles: number;
	fieldName: string;
}) => {
	const storage = createStorage();
	const fileFilter = createFileFilter();

	const limits = {
		fileSize: parseInt(process.env.MAX_FILE_SIZE || "50000000", 10), // 50MB default
		files: options.maxFiles,
	};

	if (options.maxFiles === 1) {
		return multer({ storage, fileFilter, limits }).single(options.fieldName);
	} else {
		return multer({ storage, fileFilter, limits }).array(
			options.fieldName,
			options.maxFiles,
		);
	}
};

// Error handling middleware for multer
const handleUploadError = (
	error: any,
	_req: Request,
	res: Response,
	_next: NextFunction,
) => {
	if (error instanceof multer.MulterError) {
		switch (error.code) {
			case "LIMIT_FILE_SIZE":
				return res.status(400).json({
					error: "File too large",
					message: `Maximum file size is ${parseInt(process.env.MAX_FILE_SIZE || "50000000", 10) / 1000000}MB`,
				});
			case "LIMIT_FILE_COUNT":
				return res.status(400).json({
					error: "Too many files",
					message: "Maximum 10 files allowed",
				});
			case "LIMIT_UNEXPECTED_FILE":
				return res.status(400).json({
					error: "Unexpected field",
					message: "Unexpected file field",
				});
			default:
				return res.status(400).json({
					error: "Upload error",
					message: error.message,
				});
		}
	}

	if (error.message.includes("Unsupported file type")) {
		return res.status(400).json({
			error: "Unsupported file type",
			message: error.message,
		});
	}

	logger.error("Upload error:", error);
	return res.status(500).json({
		error: "Internal server error",
		message: "Failed to process upload",
	});
};

// Create specific upload middlewares
const uploadSingle = createUploadMiddleware({ maxFiles: 1, fieldName: "file" });
const uploadMultiple = createUploadMiddleware({
	maxFiles: 10,
	fieldName: "files",
});

const uploadMiddleware = {
	uploadSingle,
	uploadMultiple,
	handleUploadError,
	ensureUploadDirs,
};

// Initialize upload directories
ensureUploadDirs();

export default uploadMiddleware;
