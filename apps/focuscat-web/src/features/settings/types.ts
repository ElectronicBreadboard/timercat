import type { TCatFace, TCatFur, TCatHat } from '@repo/ui';

export interface TAppSettings {
	version: '0.0.1';
	features: {
		goals: boolean;
	};
	appearance: {
		theme: TTheme;
	};
	audio: {
		enabled: boolean;
		volume: number;
	};
	timer: {
		timerMode: 'pomodoro' | 'countdown';
		pomodoro: {
			workDurationMinutes: number;
			shortBreakMinutes: number;
			longBreakMinutes: number;
			sessionsBeforeLongBreak: number;
			autoAdvance: boolean;
			autoAdvanceCountdownSeconds: number;
		};
		countdown: {
			durationMinutes: number;
		};
	};
	goals: {
		dailyGoalMinutes: number;
	};
	cat: {
		equippedFur: TCatFur;
		equippedFace: TCatFace;
		equippedHat: TCatHat | null;
	};
}

export type TTheme = 'light' | 'dark' | 'auto';
