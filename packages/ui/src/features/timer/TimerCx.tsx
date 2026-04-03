import { type TState } from 'feature-state';
import React from 'react';
import { type TimerStatus } from './types';

export interface TTimerCx {
	readonly $status: TState<TimerStatus, []>;
	readonly $sessionType: TState<string, []>;
	readonly $remainingSeconds: TState<number, []>;
	readonly $totalSeconds: TState<number, []>;
	readonly $overtimeSeconds: TState<number, []>;
	readonly $sessionsCompleted: TState<number, []>;
	readonly $startedAt: TState<Date | null, []>;

	start(input?: TSessionStartInput): Promise<void>;
	pause(): Promise<void>;
	resume(): Promise<void>;
	reset(): Promise<void>;
	complete(): Promise<void>;
	setDuration(minutes: number): Promise<void>;
}

export interface TSessionStartInput {
	intention?: string | null;
	profileIds?: number[] | null;
	blockThreshold?: TBlockThreshold | null;
}

export type TBlockThreshold = 'none' | 'distracting' | 'neutral';

const ReactTimerCx = React.createContext<TTimerCx | null>(null);

export const TimerCxProvider: React.FC<{ value: TTimerCx; children: React.ReactNode }> = ({
	value,
	children
}) => {
	return <ReactTimerCx.Provider value={value}>{children}</ReactTimerCx.Provider>;
};

export function useTimerCx<GTimerCx extends TTimerCx>(): GTimerCx {
	const cx = React.useContext(ReactTimerCx) as GTimerCx | null;
	if (cx == null) {
		throw new Error('useTimerCx must be used within a TimerCxProvider');
	}
	return cx as GTimerCx;
}
