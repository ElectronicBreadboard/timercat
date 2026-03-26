import { type TPomodoroCx } from '@repo/ui';
import { specta } from '@/environment';
import { toTuple } from '@/lib';
import { BaseTimerCx } from './BaseTimerCx';

export class PomodoroTimerCx extends BaseTimerCx implements TPomodoroCx {
	public readonly mode = 'pomodoro' as const;

	protected applyTimerUpdate(timer: specta.TimerDto): void {
		const prevOvertime = this.$overtimeSeconds.get();
		super.applyTimerUpdate(timer);
		this._checkAutoAdvance(prevOvertime, timer.overtimeSeconds);
	}

	public async start(intention?: string, profileIds?: number[]): Promise<void> {
		const s = this._settingsCx.$appSettings.get();
		if (s.timer.pomodoro.showSessionSetup && intention == null && profileIds == null) {
			this._navigate({ to: '/window/main/pomodoro/setup', search: { advance: false } });
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

	public async advance(intention?: string, profileIds?: number[]): Promise<void> {
		const s = this._settingsCx.$appSettings.get();
		const isBreak = !this.$sessionType.get().endsWith(':work');
		if (s.timer.pomodoro.showSessionSetup && isBreak && intention == null && profileIds == null) {
			this._navigate({ to: '/window/main/pomodoro/setup', search: { advance: true } });
			return;
		}
		const [ok, , err] = toTuple(
			await specta.commands.advancePomodoroTimer(intention ?? null, profileIds ?? null)
		);
		if (ok) {
			this.$startedAt.set(null);
		} else {
			console.error('Failed to advance timer:', err);
		}
	}

	private _checkAutoAdvance(prevOvertime: number, currentOvertime: number): void {
		if (!this._enableSideEffects || currentOvertime === 0) return;
		const { autoAdvance, autoAdvanceCountdownSeconds } =
			this._settingsCx.$appSettings.get().timer.pomodoro;
		if (!autoAdvance) return;
		if (
			prevOvertime < autoAdvanceCountdownSeconds &&
			currentOvertime >= autoAdvanceCountdownSeconds
		) {
			void this.advance();
		}
	}
}
