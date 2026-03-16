import { type TTimerCx } from '../TimerCx';

export interface TCountdownCx extends TTimerCx {
	readonly mode: 'countdown';
}
