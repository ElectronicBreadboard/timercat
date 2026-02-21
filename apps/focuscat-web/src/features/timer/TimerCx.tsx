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
import { useSettingsCx, type SettingsCx } from '@/features/settings';

export class TimerCx implements TTimerCx {
	private readonly _unlisteners: (() => void)[] = [];

	// RAF drives smooth 60fps updates in the foreground.
	// A 1Hz interval handles background tabs where RAF pauses; enough to fire sounds and keep state current.
	// A Web Worker would be more reliable but adds file + postMessage overhead.
	private _loop: TRafLoop | null = null; // null = loop is stopped
	private _backgroundInterval: ReturnType<typeof setInterval> | null = null;

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
			settingsCx.$appSettings.listen(() => {
				const settings = this._settingsCx.$appSettings.get();
				const newSpeed = Math.max(1, settings.developer.timerSpeed);
				const oldSpeed = this.$speed.get();
				this.$speed.set(newSpeed);

				// Re-anchor when speed changes so the elapsed-time calc stays correct
				if (newSpeed !== oldSpeed && this.$status.get() === 'running') {
					this.stopLoop();
					this.startLoop();
				}

				// Sync duration when idle so pomo setting changes are reflected immediately
				if (this.$status.get() === 'idle') {
					const duration = this.getDurationForSessionType(this.$sessionType.get());
					this.$totalSeconds.set(duration);
					this.$remainingSeconds.set(duration);
				}
			})
		);
	}

	public mount(): void {
		document.addEventListener('visibilitychange', this._handleVisibilityChange);
	}

	public unmount(): void {
		document.removeEventListener('visibilitychange', this._handleVisibilityChange);
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
		this.$status.set('idle');
		this.$startTime.set(null);
		this.$overtimeSeconds.set(0);
		this.$autoAdvanceCountdownSeconds.set(null);

		const duration = this.getDurationForSessionType(this.$sessionType.get());
		this.$totalSeconds.set(duration);
		this.$remainingSeconds.set(duration);
		this._updateDocumentTitle();
	}

	public async advance(): Promise<void> {
		this.stopLoop();

		const currentType = this.$sessionType.get();
		const isWork = currentType === 'pomodoro:work';
		if (isWork) {
			this._sessionCx.recordWorkSession(this.getElapsedSeconds());
			this.$sessionsCompleted.set(this.$sessionsCompleted.get() + 1);
		}

		const nextType = this.getNextSessionType();
		this.$sessionType.set(nextType);

		const duration = this.getDurationForSessionType(nextType);
		this.$totalSeconds.set(duration);
		this.$remainingSeconds.set(duration);
		this.$overtimeSeconds.set(0);
		this.$autoAdvanceCountdownSeconds.set(null);

		this.$status.set('running');
		this.$startTime.set(new Date());
		this.startLoop();
	}

	public async complete(): Promise<void> {
		const isWork = this.$sessionType.get() === 'pomodoro:work';
		if (isWork) {
			this._sessionCx.recordWorkSession(this.getElapsedSeconds());
			this.$sessionsCompleted.set(this.$sessionsCompleted.get() + 1);
		}

		this.stopLoop();
		this.$status.set('idle');
		this.$startTime.set(null);
		this.$overtimeSeconds.set(0);
		this.$autoAdvanceCountdownSeconds.set(null);

		const duration = this.getDurationForSessionType(this.$sessionType.get());
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

	// MARK: - RAF loop

	private startLoop(): void {
		this.stopLoop();
		this._loop = {
			rafId: requestAnimationFrame(this._frame),
			anchorTime: Date.now(),
			anchorRemaining: this.$remainingSeconds.get(),
			anchorOvertime: this.$overtimeSeconds.get(),
			wasInOvertime: this.$overtimeSeconds.get() > 0,
			tickedCount: 0
		};
		// 1Hz interval keeps state ticking in background tabs (RAF pauses when hidden)
		this._backgroundInterval = setInterval(() => {
			if (document.visibilityState !== 'visible') {
				this._tick(false);
			}
		}, 1000);
	}

	private stopLoop(): void {
		if (this._loop?.rafId != null) {
			cancelAnimationFrame(this._loop.rafId);
		}
		this._loop = null;
		if (this._backgroundInterval != null) {
			clearInterval(this._backgroundInterval);
			this._backgroundInterval = null;
		}
	}

	// Sets rafId = null before ticking so we can detect if advance() restarted the loop.
	// If rafId is still null after _tick, no restart happened and we schedule the next frame.
	private readonly _frame = (): void => {
		if (this._loop == null) {
			return;
		}
		this._loop.rafId = null;
		this._tick(true);
		if (this._loop != null && this._loop.rafId == null) {
			this._loop.rafId = requestAnimationFrame(this._frame);
		}
	};

	// RAF pauses in background tabs; sync state the moment the tab returns
	private readonly _handleVisibilityChange = (): void => {
		if (document.visibilityState !== 'visible' || this.$status.get() !== 'running') {
			return;
		}
		this._tick(false); // no tick sounds on catch-up; complete sound still plays
	};

	private _tick(playTickSound: boolean): void {
		if (this._loop == null) {
			return;
		}

		const speed = this.$speed.get();
		const elapsed = ((Date.now() - this._loop.anchorTime) / 1000) * speed;

		let newRemaining: number;
		let newOvertime: number;
		if (this._loop.anchorRemaining - elapsed > 0) {
			newRemaining = this._loop.anchorRemaining - elapsed;
			newOvertime = this._loop.anchorOvertime;
		} else {
			newRemaining = 0;
			newOvertime = this._loop.anchorOvertime + (elapsed - this._loop.anchorRemaining);
		}

		// Whole elapsed-seconds since anchor avoids a spurious tick on the very first frame
		if (playTickSound && speed === 1 && newRemaining > 0) {
			const elapsedWholeSecs = Math.floor(elapsed);
			if (elapsedWholeSecs > this._loop.tickedCount) {
				this._loop.tickedCount = elapsedWholeSecs;
				this.playSound('tick');
			}
		}

		const isEnteringOvertime = newRemaining === 0 && newOvertime > 0 && !this._loop.wasInOvertime;
		if (isEnteringOvertime) {
			this.playSound('complete');
			this._loop.wasInOvertime = true;
		}

		this.$remainingSeconds.set(newRemaining);
		this.$overtimeSeconds.set(newOvertime);
		this._updateDocumentTitle();

		// Auto-advance
		const pomodoro = this._settingsCx.$appSettings.get().timer.pomodoro;
		const overtimeWhole = Math.floor(newOvertime);
		const shouldCountdown = overtimeWhole > 0 && pomodoro.autoAdvance;

		if (shouldCountdown) {
			const secondsLeft = pomodoro.autoAdvanceCountdownSeconds - overtimeWhole;
			this.$autoAdvanceCountdownSeconds.set(secondsLeft > 0 ? secondsLeft : null);
			if (secondsLeft <= 0) {
				void this.advance(); // advance() calls startLoop() internally
				return;
			}
		} else {
			this.$autoAdvanceCountdownSeconds.set(null);
		}
	}

	// MARK: - Helpers

	private getNextSessionType(): string {
		const currentType = this.$sessionType.get();
		if (currentType !== 'pomodoro:work') {
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

	private getDurationForSessionType(sessionType: string): number {
		const { workDurationMinutes, shortBreakMinutes, longBreakMinutes } =
			this._settingsCx.$appSettings.get().timer.pomodoro;
		switch (sessionType) {
			case 'pomodoro:short_break':
				return shortBreakMinutes * 60;
			case 'pomodoro:long_break':
				return longBreakMinutes * 60;
			default:
				return workDurationMinutes * 60;
		}
	}
}

interface TRafLoop {
	rafId: number | null;
	anchorTime: number; // Date.now() when loop started; advances through device sleep, unlike performance.now()
	anchorRemaining: number; // remainingSeconds at that point
	anchorOvertime: number; // overtimeSeconds at that point
	wasInOvertime: boolean; // prevents the complete sound from replaying on every tick after overtime starts
	tickedCount: number; // whole elapsed timer-seconds since anchor (for tick sound)
}

export const TimerCxProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const settingsCx = useSettingsCx();
	const sessionCx = useSessionCx();
	const audioCx = useAudioCx();

	const cx = useMemoCleanup(() => {
		const timerCx = new TimerCx(settingsCx, sessionCx, audioCx);
		return [timerCx, () => timerCx.unmount()];
	}, []);

	React.useEffect(() => {
		cx.mount();
	}, [cx]);

	return <BaseTimerCxProvider value={cx}>{children}</BaseTimerCxProvider>;
};
