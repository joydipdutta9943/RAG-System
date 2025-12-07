import { PrismaClient } from "@prisma/client";

// Prisma Client with logging
export const prisma = new PrismaClient({
	log: [
		{
			emit: "event",
			level: "query",
		},
		{
			emit: "event",
			level: "error",
		},
		{
			emit: "event",
			level: "info",
		},
		{
			emit: "event",
			level: "warn",
		},
	],
});

// Redis will be initialized in the loader and passed as dependency
// This avoids creating multiple Redis connections

// Database connection and event handlers
export async function connectDatabase() {
	try {
		await prisma.$connect();
		console.log("✅ Connected to MongoDB via Prisma");

		// Setup Prisma logging
		prisma.$on("query", (e) => {
			if (process.env.NODE_ENV === "development") {
				console.log(`Query: ${e.query}`);
				console.log(`Params: ${e.params}`);
				console.log(`Duration: ${e.duration}ms`);
			}
		});

		prisma.$on("error", (e) => {
			console.error("Prisma Error:", e);
		});
	} catch (error) {
		console.error("❌ Database connection failed:", error);
		process.exit(1);
	}
}

export async function disconnectDatabase() {
	await prisma.$disconnect();
	console.log("🔌 Disconnected from MongoDB");
}
