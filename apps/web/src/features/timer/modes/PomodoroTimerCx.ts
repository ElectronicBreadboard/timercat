import { type TPomodoroCx, type TSessionStartInput } from '@repo/ui';
import { createState } from 'feature-state';
import { type AudioCx } from '@/features/audio';
import { type SessionCx } from '@/features/session';
import { type SettingsCx, type TAppSettings } from '@/features/settings';
import { BaseTimerCx } from './BaseTimerCx';

export class PomodoroTimerCx extends BaseTimerCx implements TPomodoroCx {
	public readonly mode = 'pomodoro' as const;
	public readonly $sessionType = createState('pomodoro:work');
	public readonly $sessionSetupRequested = createState<'start' | 'advance' | null>(null);

	constructor(settingsCx: SettingsCx, sessionCx: SessionCx, audioCx: AudioCx) {
		super(settingsCx, sessionCx, audioCx);
		this._applyIdleState();
	}

	public dismissSessionSetup(): void {
		this.$sessionSetupRequested.set(null);
	}

	public async start(input?: TSessionStartInput): Promise<void> {
		if (this.$status.get() !== 'idle') return;
		const s = this._settingsCx.$appSettings.get();
		if (s.timer.showSessionSetup && input == null) {
			this.$sessionSetupRequested.set('start');
			return;
		}
		this.$sessionSetupRequested.set(null);
		this._activeSessionId = await this._sessionCx.createSession({
			session_type: this.$sessionType.get(),
			planned_seconds: this.$totalSeconds.get(),
			intention: input?.intention?.trim() ?? null,
			started_at: Date.now()
		});
		this.$status.set('running');
		this.$startedAt.set(new Date());
		this.startLoop();
	}

	public async advance(input?: TSessionStartInput): Promise<void> {
		const s = this._settingsCx.$appSettings.get();
		const isBreak = !this.$sessionType.get().endsWith(':work');
		if (s.timer.showSessionSetup && isBreak && input == null) {
			this.$sessionSetupRequested.set('advance');
			return;
		}
		this.stopLoop();
		this.$sessionSetupRequested.set(null);

		const now = Date.now();
		const elapsed = this._getElapsedSeconds();
		if (this._activeSessionId != null) {
			await this._sessionCx.completeSession(this._activeSessionId, now, elapsed);
			this._activeSessionId = null;
		}

		const currentType = this.$sessionType.get();
		if (currentType === 'pomodoro:work') {
			this.$sessionsCompleted.set(this.$sessionsCompleted.get() + 1);
		}

		const nextType = this._getNextSessionType();
		this.$sessionType.set(nextType);
		const duration = this._getDuration(nextType);
		this.$totalSeconds.set(duration);
		this.$remainingSeconds.set(duration);
		this.$overtimeSeconds.set(0);

		this._activeSessionId = await this._sessionCx.createSession({
			session_type: nextType,
			planned_seconds: duration,
			intention: input?.intention?.trim() ?? null,
			started_at: now
		});

		this.$status.set('running');
		this.$startedAt.set(new Date());
		this.startLoop();
	}

	public async reset(): Promise<void> {
		this.stopLoop();
		if (this._activeSessionId != null) {
			await this._sessionCx.cancelSession(
				this._activeSessionId,
				Date.now(),
				this._getElapsedSeconds()
			);
			this._activeSessionId = null;
		}
		this.$status.set('idle');
		this.$startedAt.set(null);
		this.$overtimeSeconds.set(0);
		this.$sessionsCompleted.set(0);
		this._applyIdleState();
		this._updateDocumentTitle();
	}

	public async complete(): Promise<void> {
		this.stopLoop();
		if (this._activeSessionId != null) {
			await this._sessionCx.completeSession(
				this._activeSessionId,
				Date.now(),
				this._getElapsedSeconds()
			);
			this._activeSessionId = null;
		}
		this.$status.set('idle');
		this.$startedAt.set(null);
		this.$sessionsCompleted.set(0);
		this.$overtimeSeconds.set(0);
		this._applyIdleState();
		this._updateDocumentTitle();
	}

	protected override _onTick(prevOvertime: number, newOvertime: number): void {
		const pomodoro = this._settingsCx.$appSettings.get().timer.pomodoro;
		if (newOvertime > 0 && pomodoro.autoAdvance) {
			const threshold = pomodoro.autoAdvanceCountdownSeconds;
			if (prevOvertime < threshold && newOvertime >= threshold) {
				void this.advance();
			}
		}
	}

	protected _applyIdleState(): void {
		this.$sessionType.set('pomodoro:work');
		const duration = this._getDuration('pomodoro:work');
		this.$totalSeconds.set(duration);
		this.$remainingSeconds.set(duration);
	}

	private _getNextSessionType(): string {
		if (this.$sessionType.get() !== 'pomodoro:work') return 'pomodoro:work';
		const completed = this.$sessionsCompleted.get();
		const { sessionsBeforeLongBreak } = this._settingsCx.$appSettings.get().timer.pomodoro;
		return completed > 0 && completed % sessionsBeforeLongBreak === 0
			? 'pomodoro:long_break'
			: 'pomodoro:short_break';
	}

	private _getDuration(
		sessionType: string,
		settings: TAppSettings['timer'] = this._settingsCx.$appSettings.get().timer
	): number {
		switch (sessionType) {
			case 'pomodoro:short_break':
				return settings.pomodoro.shortBreakMinutes * 60;
			case 'pomodoro:long_break':
				return settings.pomodoro.longBreakMinutes * 60;
			default:
				return settings.pomodoro.workDurationMinutes * 60;
		}
	}
}
