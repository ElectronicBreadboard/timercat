// Wrap a single IDBRequest in a Promise. Only safe for standalone requests —
// do NOT use across a read-modify-write chain (use callbacks instead to keep
// the transaction alive).
export function idbReq<T>(req: IDBRequest<T>): Promise<T> {
	return new Promise((resolve, reject) => {
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
}
