import type { TCatFace, TCatFur, TCatHat } from '@repo/ui';

export interface TAppSettings {
	version: '0.0.3';
	features: {
		goals: boolean;
		catWindow: boolean;
		developer: boolean;
	};
	appearance: {
		theme: TTheme;
	};
	audio: {
		session: { enabled: boolean; volume: number };
		sessionEnd: { enabled: boolean; volume: number };
		effects: { enabled: boolean; volume: number };
	};
	developer: {
		cat: boolean;
		timerSpeed: number;
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
		showSessionSetup: boolean;
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
