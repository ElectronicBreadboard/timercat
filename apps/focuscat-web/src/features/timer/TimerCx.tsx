import {
	TimerCxProvider as BaseTimerCxProvider,
	formatTime,
	useMemoCleanup,
	type TTimerCx
} from '@repo/ui';
import { createState, TState } from 'feature-state';
import React from 'react';
import { TSoundId, useAudioCx, type AudioCx } from '@/features/audio';
import { useSessionCx, type SessionCx } from '@/features/session';
import { useSettingsCx, type SettingsCx, type TAppSettings } from '@/features/settings';

export class TimerCx implements TTimerCx {
	private readonly _unlisteners: (() => void)[] = [];

	private _interval: ReturnType<typeof setInterval> | null = null;
	private _remainingAtStart = 0;
	private _startedAt = 0;
	private _activeSessionId: number | null = null;

	private readonly _settingsCx: SettingsCx;
	private readonly _sessionCx: SessionCx;
	private readonly _audioCx: AudioCx;

	public readonly $status = createState<'idle' | 'running' | 'paused'>('idle');
	public readonly $sessionType = createState('pomodoro:work');
	public readonly $remainingSeconds: TState<number, []>;
	public readonly $totalSeconds: TState<number, []>;
	public readonly $overtimeSeconds = createState(0);
	public readonly $autoAdvanceCountdownSeconds = createState<number | null>(null);
	public readonly $sessionsCompleted = createState(0);
	public readonly $speed: TState<number, []>;
	public readonly $startTime = createState<Date | null>(null);
	public readonly $intention = createState<string | null>(null);

	constructor(settingsCx: SettingsCx, sessionCx: SessionCx, audioCx: AudioCx) {
		this._settingsCx = settingsCx;
		this._sessionCx = sessionCx;
		this._audioCx = audioCx;

		const app = settingsCx.$appSettings.get();
		const workSeconds = app.timer.pomodoro.workDurationMinutes * 60;
		this.$remainingSeconds = createState(workSeconds);
		this.$totalSeconds = createState(workSeconds);
		this.$speed = createState(Math.max(1, app.developer.timerSpeed));

		this._unlisteners.push(
			settingsCx.$appSettings.listen(({ value: settings, prevValue: prevSettings }) => {
				const newSpeed = Math.max(1, settings.developer.timerSpeed);
				const oldSpeed = this.$speed.get();
				this.$speed.set(newSpeed);

				// Restart interval with new duration when speed changes
				if (newSpeed !== oldSpeed && this.$status.get() === 'running') {
					this.stopLoop();
					this.startLoop();
				}

				// Apply new duration (if idle and timer settings changed)
				if (this.$status.get() === 'idle') {
					const sessionType = this.$sessionType.get();
					const prevDuration =
						prevSettings != null
							? this.getDurationForSessionType(sessionType, prevSettings.timer)
							: null;
					const duration = this.getDurationForSessionType(sessionType, settings.timer);
					if (prevDuration == null || prevDuration !== duration) {
						this.$totalSeconds.set(duration);
						this.$remainingSeconds.set(duration);
					}
				}
			})
		);
	}

	public unmount(): void {
		this.stopLoop();
		for (const unlisten of this._unlisteners) {
			unlisten();
		}
		this._unlisteners.length = 0;
		document.title = 'FocusCat';
	}

	// MARK: - Timer commands

	public async start(): Promise<void> {
		if (this.$status.get() !== 'idle') {
			return;
		}
		const startedAt = Date.now();
		this._activeSessionId = await this._sessionCx.createSession({
			session_type: this.$sessionType.get(),
			planned_seconds: this.$totalSeconds.get(),
			intention: this.$intention.get(),
			started_at: startedAt
		});
		this.$status.set('running');
		this.$startTime.set(new Date());
		this.startLoop();
	}

	public async pause(): Promise<void> {
		if (this.$status.get() !== 'running') {
			return;
		}
		this.$status.set('paused');
		this.stopLoop();
		this._updateDocumentTitle();
	}

	public async resume(): Promise<void> {
		if (this.$status.get() !== 'paused') {
			return;
		}
		this.$status.set('running');
		this.$startTime.set(new Date());
		this.startLoop();
	}

	public async reset(): Promise<void> {
		this.stopLoop();

		if (this._activeSessionId != null) {
			await this._sessionCx.cancelSession(
				this._activeSessionId,
				Date.now(),
				this.getElapsedSeconds()
			);
			this._activeSessionId = null;
		}

		this.$status.set('idle');
		this.$startTime.set(null);
		this.$overtimeSeconds.set(0);
		this.$autoAdvanceCountdownSeconds.set(null);
		this.$sessionType.set('pomodoro:work');
		this.$sessionsCompleted.set(0);
		this.$intention.set(null);

		const duration = this.getDurationForSessionType(this.$sessionType.get());
		this.$totalSeconds.set(duration);
		this.$remainingSeconds.set(duration);
		this._updateDocumentTitle();
	}

	public async advance(): Promise<void> {
		this.stopLoop();

		const now = Date.now();
		const elapsed = this.getElapsedSeconds();
		if (this._activeSessionId != null) {
			await this._sessionCx.completeSession(this._activeSessionId, now, elapsed);
			this._activeSessionId = null;
		}

		const currentType = this.$sessionType.get();
		if (currentType === 'pomodoro:work') {
			this.$sessionsCompleted.set(this.$sessionsCompleted.get() + 1);
		}

		const nextType = this.getNextSessionType();
		this.$sessionType.set(nextType);

		const duration = this.getDurationForSessionType(nextType);
		this.$totalSeconds.set(duration);
		this.$remainingSeconds.set(duration);
		this.$overtimeSeconds.set(0);
		this.$autoAdvanceCountdownSeconds.set(null);
		this.$intention.set(null);

		this._activeSessionId = await this._sessionCx.createSession({
			session_type: nextType,
			planned_seconds: duration,
			intention: null,
			started_at: now
		});

		this.$status.set('running');
		this.$startTime.set(new Date());
		this.startLoop();
	}

	public async complete(): Promise<void> {
		this.stopLoop();

		const elapsed = this.getElapsedSeconds();
		if (this._activeSessionId != null) {
			await this._sessionCx.completeSession(this._activeSessionId, Date.now(), elapsed);
			this._activeSessionId = null;
		}

		this.$status.set('idle');
		this.$startTime.set(null);
		this.$sessionType.set('pomodoro:work');
		this.$sessionsCompleted.set(0);
		this.$overtimeSeconds.set(0);
		this.$autoAdvanceCountdownSeconds.set(null);
		this.$intention.set(null);

		const duration = this.getDurationForSessionType('pomodoro:work');
		this.$totalSeconds.set(duration);
		this.$remainingSeconds.set(duration);
		this._updateDocumentTitle();
	}

	public async setDuration(minutes: number): Promise<void> {
		if (this.$status.get() !== 'idle') {
			return;
		}
		const seconds = minutes * 60;
		this.$totalSeconds.set(seconds);
		this.$remainingSeconds.set(seconds);
	}

	public playSound(id: string): void {
		this._audioCx.playSound(id as TSoundId);
	}

	public setIntention(value: string | null): void {
		this.$intention.set(value);
	}

	private _updateDocumentTitle(): void {
		const status = this.$status.get();
		const remaining = this.$remainingSeconds.get();
		const overtime = this.$overtimeSeconds.get();

		let newTitle: string;
		if (status === 'idle') {
			newTitle = 'FocusCat';
		} else if (remaining === 0 && overtime > 0) {
			newTitle = `+${formatTime(overtime)} • FocusCat`;
		} else {
			const prefix = status === 'paused' ? '⏸ ' : '';
			newTitle = `${prefix}${formatTime(remaining)} • FocusCat`;
		}

		if (document.title !== newTitle) {
			document.title = newTitle;
		}
	}

	// MARK: - Timer loop
	//
	// Note: Using setInterval (not e.g. RAF) so the timer keeps ticking when the tab is in the background.
	// Each tick derives remaining/overtime from Date.now so we self-correct after throttling or sleep.

	private startLoop(): void {
		this.stopLoop();
		this._remainingAtStart = this.$remainingSeconds.get();
		this._startedAt = Date.now();
		this._interval = setInterval(() => this._tick(), Math.round(1000 / this.$speed.get()));
	}

	private stopLoop(): void {
		if (this._interval != null) {
			clearInterval(this._interval);
			this._interval = null;
		}
	}

	private _tick(): void {
		const speed = this.$speed.get();
		const elapsed = Math.floor(((Date.now() - this._startedAt) / 1000) * speed);
		const newRemaining = Math.max(0, this._remainingAtStart - elapsed);
		const newOvertime = Math.max(0, elapsed - this._remainingAtStart);

		const oldRemaining = this.$remainingSeconds.get();
		const oldOvertime = this.$overtimeSeconds.get();

		if (speed === 1 && newRemaining > 0 && newRemaining < oldRemaining) {
			this.playSound('tick');
		}
		if (oldOvertime === 0 && newOvertime > 0) {
			this.playSound('complete');
		}

		this.$remainingSeconds.set(newRemaining);
		this.$overtimeSeconds.set(newOvertime);
		this._updateDocumentTitle();

		// Auto-advance
		const pomodoro = this._settingsCx.$appSettings.get().timer.pomodoro;
		const shouldCountdown = newOvertime > 0 && pomodoro.autoAdvance;

		if (shouldCountdown) {
			const secondsLeft = pomodoro.autoAdvanceCountdownSeconds - newOvertime;
			this.$autoAdvanceCountdownSeconds.set(secondsLeft > 0 ? secondsLeft : null);
			if (secondsLeft <= 0) {
				void this.advance();
				return;
			}
		} else {
			this.$autoAdvanceCountdownSeconds.set(null);
		}
	}

	// MARK: - Helpers

	private getNextSessionType(): string {
		if (this.$sessionType.get() !== 'pomodoro:work') {
			return 'pomodoro:work';
		}

		const completed = this.$sessionsCompleted.get();
		const { sessionsBeforeLongBreak } = this._settingsCx.$appSettings.get().timer.pomodoro;
		const isDueForLongBreak = completed > 0 && completed % sessionsBeforeLongBreak === 0;
		return isDueForLongBreak ? 'pomodoro:long_break' : 'pomodoro:short_break';
	}

	private getElapsedSeconds(): number {
		return this.$totalSeconds.get() - this.$remainingSeconds.get() + this.$overtimeSeconds.get();
	}

	private getDurationForSessionType(
		sessionType: string,
		settings: TAppSettings['timer'] = this._settingsCx.$appSettings.get().timer
	): number {
		switch (sessionType) {
			case 'pomodoro:short_break':
				return settings.pomodoro.shortBreakMinutes * 60;
			case 'pomodoro:long_break':
				return settings.pomodoro.longBreakMinutes * 60;
			case 'countdown':
				return settings.countdown.durationMinutes * 60;
			default:
				return settings.pomodoro.workDurationMinutes * 60;
		}
	}
}

export const TimerCxProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const settingsCx = useSettingsCx();
	const sessionCx = useSessionCx();
	const audioCx = useAudioCx();

	const cx = useMemoCleanup(() => {
		const timerCx = new TimerCx(settingsCx, sessionCx, audioCx);
		return [timerCx, () => timerCx.unmount()];
	}, []);

	return <BaseTimerCxProvider value={cx}>{children}</BaseTimerCxProvider>;
};
