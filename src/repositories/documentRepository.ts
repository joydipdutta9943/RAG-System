import { type Collection, ObjectId } from "mongodb";
import type {
	Document,
	DocumentCreateData,
	DocumentUpdateData,
} from "../types/documentTypes.js";
import baseRepository from "./baseRepository.js";

// Document-specific repository functions
const findByUserId = async (
	collection: Collection,
	userId: string,
	options: {
		limit?: number;
		skip?: number;
		sort?: Record<string, number>;
	} = {},
): Promise<Document[]> => {
	return baseRepository.findMany<Document>(collection, { userId }, options);
};

const countByUserId = async (
	collection: Collection,
	userId: string,
): Promise<number> => {
	return baseRepository.count(collection, { userId });
};

const findByFileType = async (
	collection: Collection,
	fileType: string,
	options: { limit?: number; skip?: number } = {},
): Promise<Document[]> => {
	return baseRepository.findMany<Document>(collection, { fileType }, options);
};

const searchDocuments = async (
	collection: Collection,
	searchTerm: string,
	userId?: string,
	options: { limit?: number; skip?: number } = {},
): Promise<Document[]> => {
	const query: any = {
		$or: [
			{ title: { $regex: searchTerm, $options: "i" } },
			{ content: { $regex: searchTerm, $options: "i" } },
		],
	};

	if (userId) {
		query.userId = userId;
	}

	const queryOptions: any = {};
	if (options.limit) queryOptions.limit = options.limit;
	if (options.skip) queryOptions.skip = options.skip;

	return baseRepository.findMany<Document>(collection, query, queryOptions);
};

const findWithEmbedding = async (
	collection: Collection,
	options: { limit?: number; skip?: number } = {},
): Promise<Document[]> => {
	const query = {
		embedding: { $exists: true, $ne: null },
	};

	const queryOptions: any = {};
	if (options.limit) queryOptions.limit = options.limit;
	if (options.skip) queryOptions.skip = options.skip;

	return baseRepository.findMany<Document>(collection, query, queryOptions);
};

const updateEmbedding = async (
	collection: Collection,
	documentId: string,
	embedding: number[],
): Promise<Document> => {
	return baseRepository.updateById<Document>(collection, documentId, {
		embedding,
		updatedAt: new Date(),
	});
};

const addEntity = async (
	collection: Collection,
	documentId: string,
	entity: string,
): Promise<Document> => {
	const document = await baseRepository.findOne<Document>(collection, {
		_id: new ObjectId(documentId),
	});
	if (!document) {
		throw new Error("Document not found");
	}

	const entities = document.entities || [];
	if (!entities.includes(entity)) {
		entities.push(entity);
	}

	return baseRepository.updateById<Document>(collection, documentId, {
		entities,
		updatedAt: new Date(),
	});
};

const removeEntity = async (
	collection: Collection,
	documentId: string,
	entity: string,
): Promise<Document> => {
	const document = await baseRepository.findOne<Document>(collection, {
		_id: new ObjectId(documentId),
	});
	if (!document) {
		throw new Error("Document not found");
	}

	const entities = (document.entities || []).filter(
		(e: string) => e !== entity,
	);

	return baseRepository.updateById<Document>(collection, documentId, {
		entities,
		updatedAt: new Date(),
	});
};

const findByEntities = async (
	collection: Collection,
	entities: string[],
	options: { limit?: number; skip?: number } = {},
): Promise<Document[]> => {
	const query = {
		entities: { $in: entities },
	};

	const queryOptions: any = {};
	if (options.limit) queryOptions.limit = options.limit;
	if (options.skip) queryOptions.skip = options.skip;

	return baseRepository.findMany<Document>(collection, query, queryOptions);
};

const getDocumentsByDateRange = async (
	collection: Collection,
	startDate: Date,
	endDate: Date,
	userId?: string,
): Promise<Document[]> => {
	const query: any = {
		createdAt: {
			$gte: startDate,
			$lte: endDate,
		},
	};

	if (userId) {
		query.userId = userId;
	}

	return baseRepository.findMany<Document>(collection, query, {
		sort: { createdAt: -1 },
	});
};

const getDocumentStats = async (collection: Collection, userId?: string) => {
	const matchQuery: any = userId ? { userId } : {};

	const pipeline = [
		{ $match: matchQuery },
		{
			$group: {
				_id: null,
				totalDocuments: { $sum: 1 },
				totalSize: { $sum: "$fileSize" },
				averageSize: { $avg: "$fileSize" },
				byFileType: {
					$push: "$fileType",
				},
				byDate: {
					$push: "$createdAt",
				},
			},
		},
	];

	const result = await collection.aggregate(pipeline).toArray();

	if (result.length === 0) {
		return {
			totalDocuments: 0,
			totalSize: 0,
			averageSize: 0,
			fileTypeDistribution: {},
			dailyUploads: {},
		};
	}

	const stats = result[0];
	const fileTypeDistribution = stats.byFileType.reduce(
		(acc: any, type: string) => {
			acc[type] = (acc[type] || 0) + 1;
			return acc;
		},
		{},
	);

	return {
		totalDocuments: stats.totalDocuments,
		totalSize: stats.totalSize,
		averageSize: stats.averageSize,
		fileTypeDistribution,
	};
};

const documentRepository = {
	// Base repository methods
	findById: (collection: Collection, id: string) =>
		baseRepository.findById<Document>(collection, id),
	findOne: (collection: Collection, query: any) =>
		baseRepository.findOne<Document>(collection, query),
	findMany: (collection: Collection, query?: any, options?: any) =>
		baseRepository.findMany<Document>(collection, query, options),
	createOne: (collection: Collection, data: DocumentCreateData) =>
		baseRepository.createOne<Document>(collection, data),
	updateById: (collection: Collection, id: string, data: DocumentUpdateData) =>
		baseRepository.updateById<Document>(collection, id, data),
	deleteById: (collection: Collection, id: string) =>
		baseRepository.deleteById(collection, id),
	count: (collection: Collection, query?: any) =>
		baseRepository.count(collection, query),
	exists: (collection: Collection, query: any) =>
		baseRepository.exists(collection, query),

	// Document-specific methods
	findByUserId,
	countByUserId,
	findByFileType,
	searchDocuments,
	findWithEmbedding,
	updateEmbedding,
	addEntity,
	removeEntity,
	findByEntities,
	getDocumentsByDateRange,
	getDocumentStats,
};

export default documentRepository;
