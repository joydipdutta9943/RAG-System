import type { Prisma, PrismaClient, Role as PrismaRole } from "@prisma/client";
import type {
	User,
	UserCreateData,
	UserUpdateData,
} from "../types/userTypes.js";

type UserDelegate = PrismaClient["user"];

const findById = async (
	userCollection: UserDelegate,
	id: string,
): Promise<User | null> => {
	return userCollection.findUnique({
		where: { id },
	});
};

const findByEmail = async (
	userCollection: UserDelegate,
	email: string,
): Promise<User | null> => {
	return userCollection.findUnique({
		where: { email },
	});
};

const createOne = async (
	userCollection: UserDelegate,
	data: UserCreateData,
): Promise<User> => {
	return userCollection.create({ data });
};

const createWithHashedPassword = async (
	userCollection: UserDelegate,
	userData: UserCreateData,
	hashedPassword: string,
): Promise<User> => {
	return userCollection.create({
		data: {
			...userData,
			password: hashedPassword,
		},
	});
};

const updateById = async (
	userCollection: UserDelegate,
	id: string,
	data: UserUpdateData,
): Promise<User> => {
	return userCollection.update({
		where: { id },
		data: {
			...data,
			updatedAt: new Date(),
		},
	});
};

const updatePassword = async (
	userCollection: UserDelegate,
	id: string,
	hashedPassword: string,
): Promise<User> => {
	return userCollection.update({
		where: { id },
		data: {
			password: hashedPassword,
			updatedAt: new Date(),
		},
	});
};

const deleteById = async (
	userCollection: UserDelegate,
	id: string,
): Promise<boolean> => {
	const result = await userCollection.delete({
		where: { id },
	});
	return result !== null; // Prisma delete returns the deleted object or throws error if not found
};

const count = async (
	userCollection: UserDelegate,
	query: Prisma.UserWhereInput = {},
): Promise<number> => {
	return userCollection.count({
		where: query,
	});
};

const findMany = async (
	userCollection: UserDelegate,
	query: Prisma.UserWhereInput = {},
	options: {
		skip?: number;
		take?: number;
		orderBy?: Prisma.UserOrderByWithRelationInput;
	} = {},
): Promise<User[]> => {
	return userCollection.findMany({
		where: query,
		skip: options.skip,
		take: options.take,
		orderBy: options.orderBy,
	});
};

const exists = async (
	userCollection: UserDelegate,
	query: Prisma.UserWhereInput,
): Promise<boolean> => {
	const user = await userCollection.findFirst({
		where: query,
		select: { id: true },
	});
	return user !== null;
};

const findUsersByRole = async (
	userCollection: UserDelegate,
	role: string,
	options: { limit?: number; skip?: number } = {},
): Promise<User[]> => {
	return findMany(
		userCollection,
		{ role: role as PrismaRole },
		{ skip: options.skip, take: options.limit },
	);
};

const countUsersByRole = async (
	userCollection: UserDelegate,
	role: string,
): Promise<number> => {
	return userCollection.count({
		where: { role: role as PrismaRole },
	});
};

const searchUsers = async (
	userCollection: UserDelegate,
	searchTerm: string,
	options: { limit?: number; skip?: number } = {},
): Promise<User[]> => {
	return findMany(
		userCollection,
		{
			OR: [
				{ name: { contains: searchTerm, mode: "insensitive" } },
				{ email: { contains: searchTerm, mode: "insensitive" } },
			],
		},
		{ skip: options.skip, take: options.limit },
	);
};

const deactivateUser = async (
	userCollection: UserDelegate,
	userId: string,
): Promise<User> => {
	return updateById(userCollection, userId, { isActive: false });
};

const activateUser = async (
	userCollection: UserDelegate,
	userId: string,
): Promise<User> => {
	return updateById(userCollection, userId, { isActive: true });
};

const userRepository = {
	findById,
	findByEmail,
	createOne,
	createWithHashedPassword,
	updateById,
	updatePassword,
	deleteById,
	count,
	findMany,
	exists,
	findUsersByRole,
	countUsersByRole,
	searchUsers,
	deactivateUser,
	activateUser,
};

export default userRepository;
