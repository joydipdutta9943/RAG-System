import type { Document } from "mongodb";
import { type Collection, ObjectId } from "mongodb";

interface FindByIdOptions {
	projection?: Record<string, number>;
}

interface FindOneOptions {
	projection?: Record<string, number>;
	sort?: Record<string, number>;
}

interface FindManyOptions {
	projection?: Record<string, number>;
	sort?: Record<string, number>;
	limit?: number;
	skip?: number;
}

const findById = async <T>(
	collection: Collection,
	id: string,
	options: FindByIdOptions = {},
): Promise<T | null> => {
	try {
		const document = await collection.findOne(
			{ _id: new ObjectId(id) },
			{ projection: options.projection },
		);
		return document
			? ({ ...document, id: document._id.toString() } as T)
			: null;
	} catch (error) {
		throw new Error(`Failed to find document by id: ${error}`);
	}
};

const findOne = async <T>(
	collection: Collection,
	query: Record<string, any>,
	options: FindOneOptions = {},
): Promise<T | null> => {
	try {
		const findOptions: any = {
			projection: options.projection,
		};

		if (options.sort) {
			findOptions.sort = options.sort;
		}

		const document = await collection.findOne(query, findOptions);
		return document
			? ({ ...document, id: document._id.toString() } as T)
			: null;
	} catch (error) {
		throw new Error(`Failed to find one document: ${error}`);
	}
};

const findMany = async <T>(
	collection: Collection,
	query: Record<string, any> = {},
	options: FindManyOptions = {},
): Promise<T[]> => {
	try {
		const findOptions: any = {
			projection: options.projection,
		};

		if (options.sort) {
			findOptions.sort = options.sort;
		}

		if (options.skip) {
			findOptions.skip = options.skip;
		}

		if (options.limit) {
			findOptions.limit = options.limit;
		}

		const documents = await collection.find(query, findOptions).toArray();
		return documents.map((doc) => ({ ...doc, id: doc._id.toString() })) as T[];
	} catch (error) {
		throw new Error(`Failed to find many documents: ${error}`);
	}
};

const createOne = async <T>(
	collection: Collection,
	data: Partial<T>,
): Promise<T> => {
	try {
		const document = {
			...data,
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		const result = await collection.insertOne(document as Document);
		const createdDocument = await collection.findOne({
			_id: result.insertedId,
		});
		return { ...createdDocument!, id: createdDocument?._id.toString() } as T;
	} catch (error) {
		throw new Error(`Failed to create document: ${error}`);
	}
};

const updateById = async <T>(
	collection: Collection,
	id: string,
	data: Partial<T>,
): Promise<T> => {
	try {
		const updateData = {
			...data,
			updatedAt: new Date(),
		};

		const result = await collection.findOneAndUpdate(
			{ _id: new ObjectId(id) },
			{ $set: updateData },
			{ returnDocument: "after" },
		);

		if (!result.value) {
			throw new Error("Document not found");
		}

		return { ...result.value, id: result.value._id.toString() } as T;
	} catch (error) {
		throw new Error(`Failed to update document: ${error}`);
	}
};

const deleteById = async (
	collection: Collection,
	id: string,
): Promise<boolean> => {
	try {
		const result = await collection.deleteOne({ _id: new ObjectId(id) });
		return result.deletedCount === 1;
	} catch (error) {
		throw new Error(`Failed to delete document: ${error}`);
	}
};

const count = async (
	collection: Collection,
	query: Record<string, any> = {},
): Promise<number> => {
	try {
		return await collection.countDocuments(query);
	} catch (error) {
		throw new Error(`Failed to count documents: ${error}`);
	}
};

const exists = async (
	collection: Collection,
	query: Record<string, any>,
): Promise<boolean> => {
	try {
		const result = await collection.findOne(query, { projection: { _id: 1 } });
		return result !== null;
	} catch (error) {
		throw new Error(`Failed to check document existence: ${error}`);
	}
};

const baseRepository = {
	findById,
	findOne,
	findMany,
	createOne,
	updateById,
	deleteById,
	count,
	exists,
};

export default baseRepository;
