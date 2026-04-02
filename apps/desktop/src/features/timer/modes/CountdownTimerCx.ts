import { type TCountdownCx } from '@repo/ui';
import { specta } from '@/environment';
import { toTuple } from '@/lib';
import { BaseTimerCx } from './BaseTimerCx';

export class CountdownTimerCx extends BaseTimerCx implements TCountdownCx {
	public readonly mode = 'countdown' as const;

	public async start(intention?: string, profileIds?: number[]): Promise<void> {
		const s = this._settingsCx.$appSettings.get();
		if (s.timer.countdown.showSessionSetup && intention == null && profileIds == null) {
			this._navigate({ to: '/window/main/countdown/setup' });
			return;
		}
		const [ok, , err] = toTuple(
			await specta.commands.startTimer(intention ?? null, profileIds ?? null)
		);
		if (ok) {
			this.$startedAt.set(new Date());
		} else {
			console.error('Failed to start timer:', err);
		}
	}
}
