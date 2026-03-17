import { type TTimerCx } from '../TimerCx';

export interface TProgressivePomodoroCx extends TTimerCx {
	readonly mode: 'progressive';
	advance(): Promise<void>;
	advanceWithSuggestion(workSeconds: number, breakSeconds: number | null): Promise<void>;
}
