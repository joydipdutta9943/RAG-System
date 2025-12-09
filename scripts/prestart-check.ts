#!/usr/bin/env bun

// Pre-startup validation script for Cloud Run
const requiredEnvVars = ["DATABASE_URL", "REDIS_URL", "JWT_SECRET"];

const optionalEnvVars = ["GOOGLE_AI_API_KEY", "FRONTEND_URL"];

console.log("🔍 Pre-startup environment validation...");

// Check required environment variables
const missingRequired = requiredEnvVars.filter(
	(envVar) => !process.env[envVar],
);
if (missingRequired.length > 0) {
	console.error("❌ Missing required environment variables:");
	missingRequired.forEach((envVar) => {
		console.error(`   - ${envVar}`);
	});
	process.exit(1);
}

// Check optional environment variables
const missingOptional = optionalEnvVars.filter(
	(envVar) => !process.env[envVar],
);
if (missingOptional.length > 0) {
	console.warn("⚠️  Missing optional environment variables:");
	missingOptional.forEach((envVar) => {
		console.warn(`   - ${envVar}`);
	});
}

console.log("✅ Environment validation passed");
console.log(
	`📊 PORT: ${process.env.PORT || "Not set (Cloud Run will set it)"}`,
);
console.log(`🌍 NODE_ENV: ${process.env.NODE_ENV || "development"}`);
console.log(`🗄️  DATABASE_URL: ${process.env.DATABASE_URL ? "Set" : "Not set"}`);
console.log(`🔴 REDIS_URL: ${process.env.REDIS_URL ? "Set" : "Not set"}`);
console.log(`🔑 JWT_SECRET: ${process.env.JWT_SECRET ? "Set" : "Not set"}`);
console.log(
	`🤖 GOOGLE_AI_API_KEY: ${process.env.GOOGLE_AI_API_KEY ? "Set" : "Not set"}`,
);

process.exit(0);
