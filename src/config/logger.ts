import path from "node:path";
import winston from "winston";

const logFormat = winston.format.combine(
	winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
	winston.format.errors({ stack: true }),
	winston.format.json(),
);

const consoleFormat = winston.format.combine(
	winston.format.colorize(),
	winston.format.simple(),
	winston.format.printf(({ level, message }) => {
		return `[${level}]: ${message}`;
	}),
);

export const logger = winston.createLogger({
	level: process.env.LOG_LEVEL || "info",
	format: logFormat,
	defaultMeta: { service: "enhanced-rag-system" },
	transports: [
		new winston.transports.File({
			filename: path.join(process.cwd(), "logs", "error.log"),
			level: "error",
		}),
		new winston.transports.File({
			filename: path.join(process.cwd(), "logs", "combined.log"),
		}),
	],
});

if (process.env.NODE_ENV !== "production") {
	logger.add(
		new winston.transports.Console({
			format: consoleFormat,
		}),
	);
}

export default logger;
