import { type Db, MongoClient } from "mongodb";
import { logger } from "../config/logger.js";

const connectToDatabase = async (): Promise<MongoClient> => {
	const mongoUri =
		process.env.DATABASE_URL || "mongodb://localhost:27017/enhanced-rag-system";

	try {
		const client = new MongoClient(mongoUri);
		await client.connect();
		logger.info("✅ Database connected successfully");
		return client;
	} catch (error) {
		logger.error("❌ Database connection failed:", error);
		throw error;
	}
};

const setupConnectionPool = (_client: MongoClient): void => {
	// Connection pool is automatically managed by MongoDB Node.js driver
	// Additional pool configuration can be added here if needed
	logger.info("🔧 Database connection pool configured");
};

const handleConnectionEvents = (client: MongoClient): void => {
	client.on("error", (error) => {
		logger.error("Database connection error:", error);
	});

	client.on("close", () => {
		logger.warn("Database connection closed");
	});

	client.on("reconnect", () => {
		logger.info("Database reconnected");
	});
};

const getDatabaseInstance = (client: MongoClient): Db => {
	return client.db();
};

const databaseLoader = {
	connectToDatabase,
	setupConnectionPool,
	handleConnectionEvents,
	getDatabaseInstance,
};

export default databaseLoader;
