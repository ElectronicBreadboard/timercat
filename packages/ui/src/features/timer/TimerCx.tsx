import { type TState } from 'feature-state';
import React from 'react';
import { type TimerStatus } from './types';

export interface TTimerCx {
	readonly $status: TState<TimerStatus, []>;
	readonly $sessionType: TState<string, []>;
	readonly $remainingSeconds: TState<number, []>;
	readonly $totalSeconds: TState<number, []>;
	readonly $overtimeSeconds: TState<number, []>;
	readonly $autoAdvanceCountdownSeconds: TState<number | null, []>;
	readonly $sessionsCompleted: TState<number, []>;
	readonly $speed: TState<number, []>;
	readonly $startTime: TState<Date | null, []>;

	start(intention?: string, profileIds?: number[]): Promise<void>;
	pause(): Promise<void>;
	resume(): Promise<void>;
	reset(): Promise<void>;
	advance(intention?: string, profileIds?: number[]): Promise<void>;
	complete(): Promise<void>;
	setDuration(minutes: number): Promise<void>;
	playSound?(id: string): void;
}

const ReactTimerCx = React.createContext<TTimerCx | null>(null);

export const TimerCxProvider: React.FC<{ value: TTimerCx; children: React.ReactNode }> = ({
	value,
	children
}) => {
	return <ReactTimerCx.Provider value={value}>{children}</ReactTimerCx.Provider>;
};

export function useTimerCx(): TTimerCx {
	const cx = React.useContext(ReactTimerCx);
	if (cx == null) {
		throw new Error('useTimerCx must be used within a TimerCxProvider');
	}
	return cx;
}
