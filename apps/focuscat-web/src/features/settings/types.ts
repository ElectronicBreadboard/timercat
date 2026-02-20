import type { TCatFace, TCatFur, TCatHat } from '@repo/ui';

export interface TAppSettings {
	features: {
		goals: boolean;
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
