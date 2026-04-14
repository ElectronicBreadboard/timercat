import { isWorkSession, useMemoCleanup } from '@repo/ui';
import { createState } from 'feature-state';
import React from 'react';
import { unwrapOrNull } from 'tuple-result';
import { SessionRepository, type TSessionRow } from './SessionRepository';

export class SessionCx {
	private readonly _repo = new SessionRepository();
	private readonly _sessionCompleteListeners: (() => void)[] = [];

	public readonly $todayFocusSeconds = createState<number>(0);

	public async mount(): Promise<void> {
		// Cleanup active sessions orphaned by a previous crash
		const [isCleanupOk, , cleanupCount] = await this._repo.cleanupOrphaned();
		if (isCleanupOk && cleanupCount > 0) {
			console.info(`[session] Cleaned up ${cleanupCount} orphaned session(s)`);
		}

		// Load today's focus total
		const [areSecondsOk, , seconds] = await this._repo.getTodayFocusSeconds();
		if (areSecondsOk) {
			this.$todayFocusSeconds.set(seconds);
		}
	}

	public unmount(): void {}

	public async createSession(data: TCreateSessionInput): Promise<number | null> {
		return unwrapOrNull(
			await this._repo.createSession({
				...data,
				status: 'active',
				actual_seconds: null,
				ended_at: null
			})
		);
	}

	public async completeSession(id: number, endedAt: number, actualSeconds: number): Promise<void> {
		const [isCompleteOk, ,] = await this._repo.completeSession(id, endedAt, actualSeconds);
		if (!isCompleteOk) {
			return;
		}

		const [areSecondsOk, , seconds] = await this._repo.getTodayFocusSeconds();
		if (areSecondsOk) {
			this.$todayFocusSeconds.set(seconds);
		}

		this._notifySessionComplete();
	}

	public async cancelSession(id: number, endedAt: number, actualSeconds: number): Promise<void> {
		const [isCancelOk, ,] = await this._repo.cancelSession(id, endedAt, actualSeconds);
		if (!isCancelOk) {
			return;
		}

		const [areSecondsOk, , seconds] = await this._repo.getTodayFocusSeconds();
		if (areSecondsOk) {
			this.$todayFocusSeconds.set(seconds);
		}

		this._notifySessionComplete();
	}

	public async getLastWorkSession(minDurationSecs: number): Promise<TSessionRow | null> {
		const rows = await this.getSessions(0, Date.now(), 50, minDurationSecs);
		return rows.find((r) => isWorkSession(r.session_type)) ?? null;
	}

	public async getSessions(
		startedAfter: number,
		startedBefore: number,
		limit: number,
		minDurationSecs: number
	): Promise<TSessionRow[]> {
		const [ok, , rows] = await this._repo.getSessions(startedAfter, startedBefore, limit);
		if (!ok) {
			return [];
		}
		return rows.filter((r) => r.status === 'active' || (r.actual_seconds ?? 0) >= minDurationSecs);
	}

	public computeSessionStats(row: TSessionRow): TSessionStats {
		const completed = row.actual_seconds ?? row.planned_seconds;
		const overtimeSeconds = Math.max(0, completed - row.planned_seconds);
		return { overtimeSeconds };
	}

	public registerSessionComplete(callback: () => void): () => void {
		this._sessionCompleteListeners.push(callback);
		return () => {
			const i = this._sessionCompleteListeners.indexOf(callback);
			if (i !== -1) {
				this._sessionCompleteListeners.splice(i, 1);
			}
		};
	}

	private _notifySessionComplete(): void {
		for (const listener of this._sessionCompleteListeners) {
			listener();
		}
	}
}

export type TCreateSessionInput = Pick<
	TSessionRow,
	'session_type' | 'planned_seconds' | 'intention' | 'started_at'
>;

export interface TSessionStats {
	overtimeSeconds: number;
}

// MARK: - React Context

const ReactSessionCx = React.createContext<SessionCx | null>(null);

export const SessionCxProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const cx = useMemoCleanup(() => {
		const sessionCx = new SessionCx();
		return [sessionCx, () => sessionCx.unmount()];
	}, []);

	React.useEffect(() => {
		void cx.mount();
	}, [cx]);

	return <ReactSessionCx.Provider value={cx}>{children}</ReactSessionCx.Provider>;
};

export function useSessionCx(): SessionCx {
	const cx = React.useContext(ReactSessionCx);
	if (cx == null) {
		throw new Error('useSessionCx must be used within a SessionCxProvider');
	}
	return cx;
}
