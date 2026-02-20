import { useMemoCleanup } from '@repo/ui';
import { withLocalStorage } from 'feature-react';
import { createState } from 'feature-state';
import React from 'react';

export class SessionCx {
	public readonly $sessionData = withLocalStorage(
		createState<TSessionData>({
			date: this._getTodayDateString(),
			focusSeconds: 0
		}),
		'focuscat-session'
	);

	public mount(): void {
		void this.$sessionData.persist();

		// Reset if stored data is from a previous day
		const data = this.$sessionData.get();
		if (data.date !== this._getTodayDateString()) {
			this.$sessionData.set({ date: this._getTodayDateString(), focusSeconds: 0 });
		}
	}

	public unmount(): void {
		// No listeners to clean up
	}

	public recordWorkSession(elapsedSeconds: number): void {
		const data = this.$sessionData.get();
		const today = this._getTodayDateString();

		// Reset if day changed since last session
		if (data.date !== today) {
			this.$sessionData.set({ date: today, focusSeconds: elapsedSeconds });
		} else {
			this.$sessionData.set({ date: today, focusSeconds: data.focusSeconds + elapsedSeconds });
		}
	}

	private _getTodayDateString(): string {
		return new Date().toLocaleDateString('en-CA');
	}
}

interface TSessionData {
	date: string; // YYYY-MM-DD
	focusSeconds: number;
}

// MARK: - React Context

const ReactSessionCx = React.createContext<SessionCx | null>(null);

export const SessionCxProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const cx = useMemoCleanup(() => {
		const sessionCx = new SessionCx();
		return [sessionCx, () => sessionCx.unmount()];
	}, []);

	React.useEffect(() => {
		cx.mount();
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
