import { type TCountdownCx } from '@repo/ui';
import { specta } from '@/environment';
import { toTuple } from '@/lib';
import { BaseTimerCx } from './BaseTimerCx';

export class CountdownTimerCx extends BaseTimerCx implements TCountdownCx {
	public readonly mode = 'countdown' as const;

	public async start(): Promise<void> {
		const [ok, , err] = toTuple(await specta.commands.startTimer(null, null));
		if (ok) {
			this.$startedAt.set(new Date());
		} else {
			console.error('Failed to start timer:', err);
		}
	}
}
