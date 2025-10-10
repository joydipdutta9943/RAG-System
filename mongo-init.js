// MongoDB initialization script
db = db.getSiblingDB("enhanced-rag-system");

// Create collections with indexes for better performance
db.createCollection("users");
db.users.createIndex({ email: 1 }, { unique: true });

db.createCollection("documents");
db.documents.createIndex({ userId: 1 });
db.documents.createIndex({ title: "text", content: "text" });
db.documents.createIndex({ createdAt: -1 });
db.documents.createIndex({ fileType: 1 });

db.createCollection("images");
db.images.createIndex({ documentId: 1 });

db.createCollection("queries");
db.queries.createIndex({ userId: 1 });
db.queries.createIndex({ createdAt: -1 });
db.queries.createIndex({ queryType: 1 });

db.createCollection("embedding_models");
db.embedding_models.createIndex({ name: 1 }, { unique: true });

db.createCollection("system_metrics");
db.system_metrics.createIndex({ timestamp: -1 });
db.system_metrics.createIndex({ metricType: 1 });

db.createCollection("api_usage");
db.api_usage.createIndex({ date: -1 });
db.api_usage.createIndex({ apiProvider: 1 });

print("Database initialized successfully");
