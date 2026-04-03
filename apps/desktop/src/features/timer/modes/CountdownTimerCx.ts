import { type TCountdownCx, type TSessionStartInput } from '@repo/ui';
import { specta } from '@/environment';
import { toTuple } from '@/lib';
import { BaseTimerCx } from './BaseTimerCx';

export class CountdownTimerCx extends BaseTimerCx implements TCountdownCx {
	public readonly mode = 'countdown' as const;

	public async start(input?: TSessionStartInput): Promise<void> {
		const s = this._settingsCx.$appSettings.get();
		if (s.timer.countdown.showSessionSetup && input == null) {
			await this._showMainFlow('/window/main/countdown/setup');
			return;
		}
		const [ok, , err] = toTuple(await specta.commands.startTimer(this._toSessionStartInput(input)));
		if (ok) {
			this.$startedAt.set(new Date());
		} else {
			console.error('Failed to start timer:', err);
		}
	}
}
