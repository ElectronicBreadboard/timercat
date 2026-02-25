import { Err, Ok, type TResult } from 'tuple-result';
import { idbReq, toError } from '@/lib';

export class SessionRepository {
	private _db: IDBDatabase | null = null;
	private _dbPromise: Promise<IDBDatabase> | null = null;

	private readonly _config: TSessionRepositoryConfig;

	public constructor(options: Partial<TSessionRepositoryConfig> = {}) {
		const { dbName = 'focuscat', dbVersion = 1, storeName = 'sessions' } = options;
		this._config = { dbName, dbVersion, storeName };
	}

	public async createSession(data: Omit<TSessionRow, 'id'>): Promise<TResult<number, Error>> {
		try {
			const db = await this._getDb();
			const tx = db.transaction(this._config.storeName, 'readwrite');
			const id = await idbReq(tx.objectStore(this._config.storeName).add(data));
			return Ok(id as number);
		} catch (e) {
			return Err(toError(e));
		}
	}

	public async completeSession(
		id: number,
		endedAt: number,
		actualSeconds: number
	): Promise<TResult<void, Error>> {
		try {
			await this._updateSession(id, {
				status: 'completed',
				ended_at: endedAt,
				actual_seconds: actualSeconds
			});
			return Ok(undefined);
		} catch (e) {
			return Err(toError(e));
		}
	}

	public async cancelSession(
		id: number,
		endedAt: number,
		actualSeconds: number
	): Promise<TResult<void, Error>> {
		try {
			await this._updateSession(id, {
				status: 'cancelled',
				ended_at: endedAt,
				actual_seconds: actualSeconds
			});
			return Ok(undefined);
		} catch (e) {
			return Err(toError(e));
		}
	}

	// Get total focus seconds for today (midnight-to-now).
	// Includes completed work sessions and cancelled work sessions >= 30s
	// (cancelled but meaningful; user focused before being interrupted).
	public async getTodayFocusSeconds(): Promise<TResult<number, Error>> {
		try {
			const db = await this._getDb();
			const today = new Date();
			today.setHours(0, 0, 0, 0);
			const todayStart = today.getTime();
			const todayEnd = todayStart + 86_400_000;
			const range = IDBKeyRange.bound(todayStart, todayEnd, false, true);
			const tx = db.transaction(this._config.storeName, 'readonly');
			const rows = (await idbReq(
				tx.objectStore(this._config.storeName).index('started_at').getAll(range)
			)) as TSessionRow[];
			const total = rows
				.filter(
					(r) =>
						r.session_type === 'pomodoro:work' &&
						(r.status === 'completed' ||
							(r.status === 'cancelled' && (r.actual_seconds ?? 0) >= 30))
				)
				.reduce((sum, r) => sum + (r.actual_seconds ?? 0), 0);
			return Ok(total);
		} catch (e) {
			return Err(toError(e));
		}
	}

	// Find all active sessions (orphaned from a previous crash) and mark them cancelled.
	public async cleanupOrphaned(): Promise<TResult<number, Error>> {
		try {
			const db = await this._getDb();
			return await new Promise<TResult<number, Error>>((resolve) => {
				const tx = db.transaction(this._config.storeName, 'readwrite');
				const store = tx.objectStore(this._config.storeName);
				const req = store.index('status').getAll(IDBKeyRange.only('active'));

				req.onsuccess = () => {
					const rows = req.result as TSessionRow[];
					if (rows.length === 0) {
						resolve(Ok(0));
						return;
					}

					// Cap ended_at at started_at + planned duration (we don't know when the tab closed)
					// Note: store.put is safe here: we have all row data from getAll, so no get+put needed
					const now = Date.now();
					for (const row of rows) {
						const endedAt = Math.min(now, row.started_at + row.planned_seconds * 1000);
						store.put({
							...row,
							status: 'cancelled' as const,
							ended_at: endedAt,
							actual_seconds: Math.floor((endedAt - row.started_at) / 1000)
						});
					}

					tx.oncomplete = () => resolve(Ok(rows.length));
					tx.onerror = () => resolve(Err(toError(tx.error)));
				};

				req.onerror = () => resolve(Err(toError(req.error)));
			});
		} catch (e) {
			return Err(toError(e));
		}
	}

	// Read-modify-write within a single IDB transaction using callbacks (not async/await)
	// to prevent the transaction from auto-committing between the get and put requests.
	private async _updateSession(id: number, updates: Partial<TSessionRow>): Promise<void> {
		const db = await this._getDb();
		return new Promise<void>((resolve, reject) => {
			const tx = db.transaction(this._config.storeName, 'readwrite');
			const store = tx.objectStore(this._config.storeName);
			const getReq = store.get(id);
			getReq.onsuccess = () => {
				const putReq = store.put({ ...(getReq.result as TSessionRow), ...updates });
				putReq.onsuccess = () => resolve();
				putReq.onerror = () => reject(putReq.error);
			};
			getReq.onerror = () => reject(getReq.error);
		});
	}

	// Lazily open the DB on first use, reuse thereafter.
	// Clears the cached promise on failure so the next call can retry.
	private _getDb(): Promise<IDBDatabase> {
		if (this._db != null) {
			return Promise.resolve(this._db);
		}

		if (this._dbPromise == null) {
			this._dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
				const req = indexedDB.open(this._config.dbName, this._config.dbVersion);
				req.onupgradeneeded = (e) => {
					const db = (e.target as IDBOpenDBRequest).result;
					if (!db.objectStoreNames.contains(this._config.storeName)) {
						const store = db.createObjectStore(this._config.storeName, {
							keyPath: 'id',
							autoIncrement: true
						});
						store.createIndex('started_at', 'started_at');
						store.createIndex('status', 'status');
					}
				};
				req.onsuccess = (e) => {
					this._db = (e.target as IDBOpenDBRequest).result;
					resolve(this._db);
				};
				req.onerror = (e) => {
					this._dbPromise = null; // Allow retry on next call
					reject((e.target as IDBOpenDBRequest).error);
				};
			});
		}

		return this._dbPromise;
	}
}

export interface TSessionRepositoryConfig {
	dbName: string;
	dbVersion: number;
	storeName: string;
}

export interface TSessionRow {
	id: number;
	session_type: string;
	status: 'active' | 'completed' | 'cancelled';
	planned_seconds: number;
	actual_seconds: number | null;
	intention: string | null;
	started_at: number; // ms timestamp
	ended_at: number | null; // ms timestamp
}
