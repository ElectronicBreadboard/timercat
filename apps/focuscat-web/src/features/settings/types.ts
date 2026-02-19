import type { TCatFace, TCatFur, TCatHat } from '@repo/ui';

export interface TAppSettings {
	audio: {
		enabled: boolean;
		volume: number;
	};
	timer: {
		pomodoro: {
			workDurationMinutes: number;
			shortBreakMinutes: number;
			longBreakMinutes: number;
			sessionsBeforeLongBreak: number;
			autoAdvance: boolean;
			autoAdvanceCountdownSeconds: number;
		};
	};
	cat: {
		equippedFur: TCatFur;
		equippedFace: TCatFace;
		equippedHat: TCatHat | null;
	};
}
