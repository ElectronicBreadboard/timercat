import { type TState } from 'feature-state';
import { type TCountdownCx } from './modes/CountdownCx';
import { type TPomodoroCx } from './modes/PomodoroCx';
import { type TProgressivePomodoroCx } from './modes/ProgressivePomodoroCx';

export interface TTimerViewCx {
	readonly timer: TCountdownCx | TPomodoroCx | TProgressivePomodoroCx;
	readonly $previewMinutes: TState<number | null, []>;
	readonly $config: TState<TTimerViewConfig, []>;
	playSound?: (id: string) => void;
}

export interface TTimerViewConfig {
	pomodoro: {
		sessionsBeforeLongBreak: number;
		autoAdvance: boolean;
		autoAdvanceCountdownSeconds: number;
	};
	progressive: {
		autoAdvance: boolean;
		autoAdvanceCountdownSeconds: number;
	};
	dev: {
		speed: number;
	};
}
