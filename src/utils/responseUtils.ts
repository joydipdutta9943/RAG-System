const formatResponse = <T>(status: string, message: string, data?: T) => ({
	status,
	message,
	data,
	timestamp: new Date().toISOString(),
});

const successResponse = <T>(message: string, data?: T) =>
	formatResponse("success", message, data);

const errorResponse = (message: string, error?: any) =>
	formatResponse("error", message, error);

const asyncMap = async <T, R>(
	array: T[],
	fn: (item: T) => Promise<R>,
): Promise<R[]> => Promise.all(array.map(fn));

const responseUtils = {
	formatResponse,
	successResponse,
	errorResponse,
	asyncMap,
};

export default responseUtils;
