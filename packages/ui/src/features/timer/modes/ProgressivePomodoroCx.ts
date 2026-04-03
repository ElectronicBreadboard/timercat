import { type TSessionStartInput, type TTimerCx } from '../TimerCx';

export interface TProgressivePomodoroCx extends TTimerCx {
	readonly mode: 'progressive';
	advance(input?: TSessionStartInput): Promise<void>;
	advanceWithSuggestion(workSeconds: number, breakSeconds: number | null): Promise<void>;
}
