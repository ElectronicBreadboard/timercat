import { type TProgressivePomodoroCx } from '@repo/ui';
import { createState } from 'feature-state';
import { specta } from '@/environment';
import { toTuple } from '@/lib';
import { BaseTimerCx } from './BaseTimerCx';

export class ProgressivePomodoroTimerCx extends BaseTimerCx implements TProgressivePomodoroCx {
	public readonly mode = 'progressive' as const;

	// Tracks the duration for the next work session (used when break ends → advance to work).
	private readonly $currentWorkDuration = createState<number>(0);

	protected applyTimerUpdate(timer: specta.TimerDto): void {
		const prevOvertime = this.$overtimeSeconds.get();
		super.applyTimerUpdate(timer);
		this._checkAutoAdvance(prevOvertime, timer.overtimeSeconds);
	}

	public async start(intention?: string, profileIds?: number[]): Promise<void> {
		const s = this._settingsCx.$appSettings.get();
		if (s.timer.progressive.showSessionSetup && intention == null && profileIds == null) {
			this._navigate({ to: '/window/main/progressive/setup', search: { advance: false } });
			return;
		}
		const [ok, , err] = toTuple(
			await specta.commands.startTimer(intention ?? null, profileIds ?? null)
		);
		if (ok) {
			this.$startedAt.set(new Date());
		} else {
			console.error('Failed to start progressive timer:', err);
		}
	}

	public async advance(intention?: string, profileIds?: number[]): Promise<void> {
		const sessionType = this.$sessionType.get();
		if (sessionType === 'progressive:work') {
			this._navigate({ to: '/window/main/progressive/rating' });
			return;
		}

		const s = this._settingsCx.$appSettings.get();
		const isBreak = !this.$sessionType.get().endsWith(':work');
		if (
			s.timer.progressive.showSessionSetup &&
			isBreak &&
			intention == null &&
			profileIds == null
		) {
			this._navigate({ to: '/window/main/progressive/setup', search: { advance: true } });
			return;
		}

		await this._advanceSession(
			'Work',
			this.$currentWorkDuration.get(),
			intention ?? null,
			profileIds ?? null
		);
	}

	public async advanceWithSuggestion(
		workSeconds: number,
		breakSeconds: number | null
	): Promise<void> {
		this.$currentWorkDuration.set(workSeconds);
		if (breakSeconds != null) {
			await this._advanceSession('Break', breakSeconds, null, null);
		} else {
			await this._advanceSession('Work', workSeconds, null, null);
		}
	}

	private async _advanceSession(
		sessionType: specta.ProgressiveSessionType,
		durationSeconds: number,
		intention: string | null,
		profileIds: number[] | null
	): Promise<void> {
		const [ok, , err] = toTuple(
			await specta.commands.advanceProgressiveTimer(
				sessionType,
				durationSeconds,
				intention,
				profileIds
			)
		);
		if (ok) {
			this.$startedAt.set(sessionType === 'Work' ? new Date() : null);
		} else {
			console.error('Failed to start next progressive session:', err);
		}
	}

	private _checkAutoAdvance(prevOvertime: number, currentOvertime: number): void {
		if (!this._enableSideEffects || currentOvertime === 0) return;
		const { autoAdvance, autoAdvanceCountdownSeconds } =
			this._settingsCx.$appSettings.get().timer.progressive;
		if (!autoAdvance) return;
		if (
			prevOvertime < autoAdvanceCountdownSeconds &&
			currentOvertime >= autoAdvanceCountdownSeconds
		) {
			void this.advance();
		}
	}
}
