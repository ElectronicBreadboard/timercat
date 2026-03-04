import { type TState } from 'feature-state';
import { type TTimerCx } from './TimerCx';

export interface TTimerViewCx {
	readonly timer: TTimerCx;
	readonly $timerMode: TState<'countdown' | 'pomodoro', []>;
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
	dev: {
		showSpeed: boolean;
	};
}
