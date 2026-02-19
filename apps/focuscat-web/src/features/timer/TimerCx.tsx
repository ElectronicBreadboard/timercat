import { TimerCxProvider as BaseTimerCxProvider, useMemoCleanup, type TTimerCx } from '@repo/ui';
import { createState } from 'feature-state';
import React from 'react';
import { audioConfig, TSoundId } from '@/environment';
import { useSettingsCx, type SettingsCx } from '@/features/settings';

export class TimerCx implements TTimerCx {
	private _interval: ReturnType<typeof setInterval> | null = null;
	private readonly _settingsCx: SettingsCx;

	public readonly $status = createState<'idle' | 'running' | 'paused'>('idle');
	public readonly $sessionType = createState('pomodoro:work');
	public readonly $remainingSeconds: ReturnType<typeof createState<number>>;
	public readonly $totalSeconds: ReturnType<typeof createState<number>>;
	public readonly $overtimeSeconds = createState(0);
	public readonly $autoAdvanceCountdownSeconds = createState<number | null>(null);
	public readonly $sessionsCompleted = createState(0);
	public readonly $speed = createState(1);
	public readonly $startTime = createState<Date | null>(null);

	constructor(settingsCx: SettingsCx) {
		this._settingsCx = settingsCx;
		const workSeconds = settingsCx.$appSettings.get().timer.pomodoro.workDurationMinutes * 60;
		this.$remainingSeconds = createState(workSeconds);
		this.$totalSeconds = createState(workSeconds);
	}

	public async start(): Promise<void> {
		if (this.$status.get() !== 'idle') {
			return;
		}
		this.$status.set('running');
		this.$startTime.set(new Date());
		this.startInterval();
	}

	public async pause(): Promise<void> {
		if (this.$status.get() !== 'running') {
			return;
		}
		this.$status.set('paused');
		this.clearInterval();
	}

	public async resume(): Promise<void> {
		if (this.$status.get() !== 'paused') {
			return;
		}
		this.$status.set('running');
		this.$startTime.set(new Date());
		this.startInterval();
	}

	public async reset(): Promise<void> {
		this.clearInterval();
		this.$status.set('idle');
		this.$startTime.set(null);
		this.$overtimeSeconds.set(0);
		this.$autoAdvanceCountdownSeconds.set(null);

		// Reset to the current session type's duration
		const duration = this.getDurationForSessionType(this.$sessionType.get());
		this.$totalSeconds.set(duration);
		this.$remainingSeconds.set(duration);
	}

	public async advance(): Promise<void> {
		this.clearInterval();

		const currentType = this.$sessionType.get();
		const isWork = currentType === 'pomodoro:work';

		// Increment sessions completed when advancing from a work session
		if (isWork) {
			this.$sessionsCompleted.set(this.$sessionsCompleted.get() + 1);
		}

		// Determine next session type
		const nextType = this.getNextSessionType();
		this.$sessionType.set(nextType);

		const duration = this.getDurationForSessionType(nextType);
		this.$totalSeconds.set(duration);
		this.$remainingSeconds.set(duration);
		this.$overtimeSeconds.set(0);
		this.$autoAdvanceCountdownSeconds.set(null);

		// Start the next session
		this.$status.set('running');
		this.$startTime.set(new Date());
		this.startInterval();
	}

	public async complete(): Promise<void> {
		const isWork = this.$sessionType.get() === 'pomodoro:work';
		if (isWork) {
			this.$sessionsCompleted.set(this.$sessionsCompleted.get() + 1);
		}

		this.clearInterval();
		this.$status.set('idle');
		this.$startTime.set(null);
		this.$overtimeSeconds.set(0);
		this.$autoAdvanceCountdownSeconds.set(null);

		const duration = this.getDurationForSessionType(this.$sessionType.get());
		this.$totalSeconds.set(duration);
		this.$remainingSeconds.set(duration);
	}

	public async setDuration(minutes: number): Promise<void> {
		if (this.$status.get() !== 'idle') {
			return;
		}
		const seconds = minutes * 60;
		this.$totalSeconds.set(seconds);
		this.$remainingSeconds.set(seconds);
	}

	public playSound(id: TSoundId): void {
		const { enabled, volume } = this._settingsCx.$appSettings.get().audio;
		if (!enabled) {
			return;
		}
		const audio = new Audio(audioConfig.resolvePath(id));
		audio.volume = volume;
		audio.play().catch(() => {
			// Ignore audio errors (e.g. file not found, autoplay blocked)
		});
	}

	public dispose(): void {
		this.clearInterval();
	}

	private startInterval(): void {
		this.clearInterval();
		const intervalMs = 1000 / this.$speed.get();
		this._interval = setInterval(() => this.tick(), intervalMs);
	}

	private clearInterval(): void {
		if (this._interval != null) {
			clearInterval(this._interval);
			this._interval = null;
		}
	}

	private tick(): void {
		const remaining = this.$remainingSeconds.get();
		const wasInOvertime = this.$overtimeSeconds.get() > 0;

		if (remaining > 0) {
			this.$remainingSeconds.set(remaining - 1);
		} else {
			this.$overtimeSeconds.set(this.$overtimeSeconds.get() + 1);
		}

		// Play tick sound each second (only at 1x speed, matching desktop behavior)
		if (this.$speed.get() === 1) {
			this.playSound('tick');
		}

		// Play complete sound when entering overtime
		if (!wasInOvertime && this.$overtimeSeconds.get() > 0) {
			this.playSound('complete');
		}

		// Auto-advance when overtime reaches threshold
		const overtimeSeconds = this.$overtimeSeconds.get();
		const pomodoro = this._settingsCx.$appSettings.get().timer.pomodoro;
		if (overtimeSeconds > 0 && pomodoro.autoAdvance) {
			const secondsLeft = pomodoro.autoAdvanceCountdownSeconds - overtimeSeconds;
			this.$autoAdvanceCountdownSeconds.set(secondsLeft <= 0 ? null : secondsLeft);
			if (secondsLeft <= 0) {
				this.advance();
			}
		} else {
			this.$autoAdvanceCountdownSeconds.set(null);
		}
	}

	private getNextSessionType(): string {
		const currentType = this.$sessionType.get();
		if (currentType !== 'pomodoro:work') {
			// After any break, go back to work
			return 'pomodoro:work';
		}
		// After work, determine break type
		const completed = this.$sessionsCompleted.get();
		const { sessionsBeforeLongBreak } = this._settingsCx.$appSettings.get().timer.pomodoro;
		if (completed > 0 && completed % sessionsBeforeLongBreak === 0) {
			return 'pomodoro:long_break';
		}
		return 'pomodoro:short_break';
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

export const TimerCxProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const settingsCx = useSettingsCx();

	const cx = useMemoCleanup(() => {
		const timerCx = new TimerCx(settingsCx);
		return [timerCx, () => timerCx.dispose()];
	}, []);

	return <BaseTimerCxProvider value={cx}>{children}</BaseTimerCxProvider>;
};
