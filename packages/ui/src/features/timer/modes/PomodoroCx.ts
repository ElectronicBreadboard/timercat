import { type TSessionStartInput, type TTimerCx } from '../TimerCx';

export interface TPomodoroCx extends TTimerCx {
	readonly mode: 'pomodoro';
	start(input?: TSessionStartInput): Promise<void>;
	advance(input?: TSessionStartInput): Promise<void>;
}
