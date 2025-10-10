import type { Collection } from "mongodb";
import type {
	User,
	UserCreateData,
	UserUpdateData,
} from "../types/userTypes.js";
import baseRepository from "./baseRepository.js";

// User-specific repository functions
const findByEmail = async (
	collection: Collection,
	email: string,
): Promise<User | null> => {
	return baseRepository.findOne<User>(collection, { email });
};

const createWithHashedPassword = async (
	collection: Collection,
	userData: UserCreateData,
	hashedPassword: string,
): Promise<User> => {
	const userDataToCreate = {
		...userData,
		password: hashedPassword,
		createdAt: new Date(),
		updatedAt: new Date(),
	};

	return baseRepository.createOne<User>(collection, userDataToCreate);
};

const updatePassword = async (
	collection: Collection,
	userId: string,
	hashedPassword: string,
): Promise<User> => {
	return baseRepository.updateById<User>(collection, userId, {
		password: hashedPassword,
		updatedAt: new Date(),
	});
};

const findUsersByRole = async (
	collection: Collection,
	role: string,
	options: { limit?: number; skip?: number } = {},
): Promise<User[]> => {
	const queryOptions: any = {};
	if (options.limit) queryOptions.limit = options.limit;
	if (options.skip) queryOptions.skip = options.skip;

	return baseRepository.findMany<User>(collection, { role }, queryOptions);
};

const countUsersByRole = async (
	collection: Collection,
	role: string,
): Promise<number> => {
	return baseRepository.count(collection, { role });
};

const searchUsers = async (
	collection: Collection,
	searchTerm: string,
	options: { limit?: number; skip?: number } = {},
): Promise<User[]> => {
	const query = {
		$or: [
			{ name: { $regex: searchTerm, $options: "i" } },
			{ email: { $regex: searchTerm, $options: "i" } },
		],
	};

	const queryOptions: any = {};
	if (options.limit) queryOptions.limit = options.limit;
	if (options.skip) queryOptions.skip = options.skip;

	return baseRepository.findMany<User>(collection, query, queryOptions);
};

const deactivateUser = async (
	collection: Collection,
	userId: string,
): Promise<User> => {
	return baseRepository.updateById<User>(collection, userId, {
		isActive: false,
		updatedAt: new Date(),
	});
};

const activateUser = async (
	collection: Collection,
	userId: string,
): Promise<User> => {
	return baseRepository.updateById<User>(collection, userId, {
		isActive: true,
		updatedAt: new Date(),
	});
};

const userRepository = {
	// Base repository methods
	findById: (collection: Collection, id: string) =>
		baseRepository.findById<User>(collection, id),
	findOne: (collection: Collection, query: any) =>
		baseRepository.findOne<User>(collection, query),
	findMany: (collection: Collection, query?: any, options?: any) =>
		baseRepository.findMany<User>(collection, query, options),
	createOne: (collection: Collection, data: UserCreateData) =>
		baseRepository.createOne<User>(collection, data),
	updateById: (collection: Collection, id: string, data: UserUpdateData) =>
		baseRepository.updateById<User>(collection, id, data),
	deleteById: (collection: Collection, id: string) =>
		baseRepository.deleteById(collection, id),
	count: (collection: Collection, query?: any) =>
		baseRepository.count(collection, query),
	exists: (collection: Collection, query: any) =>
		baseRepository.exists(collection, query),

	// User-specific methods
	findByEmail,
	createWithHashedPassword,
	updatePassword,
	findUsersByRole,
	countUsersByRole,
	searchUsers,
	deactivateUser,
	activateUser,
};

export default userRepository;
