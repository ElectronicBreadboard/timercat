export type TTimerPhase = 'work' | 'shortBreak' | 'longBreak';
export type TTimerStatus = 'idle' | 'running' | 'paused';

export type TFocusCategory = {
	id: string;
	name: string;
	color: string;
};

export type TTimerState = {
	status: TTimerStatus;
	phase: TTimerPhase;
	totalSeconds: number;
	remainingSeconds: number;
	category: TFocusCategory | null;
	sessionsCompleted: number;
};

export type TTimerSettings = {
	workDuration: number;
	shortBreakDuration: number;
	longBreakDuration: number;
	sessionsBeforeLongBreak: number;
};
