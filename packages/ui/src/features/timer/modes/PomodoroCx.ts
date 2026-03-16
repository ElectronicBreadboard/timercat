import { type TTimerCx } from '../TimerCx';

export interface TPomodoroCx extends TTimerCx {
	readonly mode: 'pomodoro';
	start(intention?: string, profileIds?: number[]): Promise<void>;
	advance(intention?: string, profileIds?: number[]): Promise<void>;
}
