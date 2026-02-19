import { TimerCxProvider as BaseTimerCxProvider, useMemoCleanup, type TTimerCx } from '@repo/ui';
import { useNavigate } from '@tanstack/react-router';
import { createState } from 'feature-state';
import React from 'react';
import { specta } from '@/environment';
import { type SoundId } from '@/environment/specta/bindings.gen';
import { useSettingsCx, type SettingsCx } from '@/features/settings';
import { toTuple } from '@/lib';

export class TimerCx implements TTimerCx {
	private _unlisten?: () => void;
	private readonly _settingsCx: SettingsCx;
	private readonly _navigate: ReturnType<typeof useNavigate>;

	public readonly $status = createState<'idle' | 'running' | 'paused'>('idle');
	public readonly $sessionType = createState('pomodoro:work');
	public readonly $remainingSeconds = createState(0);
	public readonly $totalSeconds = createState(0);
	public readonly $overtimeSeconds = createState(0);
	public readonly $autoAdvanceCountdownSeconds = createState<number | null>(null);
	public readonly $sessionsCompleted = createState(0);
	public readonly $speed = createState(1);
	public readonly $startTime = createState<Date | null>(null);

	constructor(settingsCx: SettingsCx, navigate: ReturnType<typeof useNavigate>) {
		this._settingsCx = settingsCx;
		this._navigate = navigate;
		this.init();
	}

	private async init(): Promise<void> {
		const timer = await specta.commands.getTimer();
		this.applyTimerUpdate(timer);
		this._unlisten = await specta.events.timerUpdatedEvent.listen((event) => {
			this.applyTimerUpdate(event.payload);
		});
	}

	public unmount(): void {
		this._unlisten?.();
	}

	private applyTimerUpdate(timer: specta.TimerDto): void {
		if (this.$status.get() !== timer.status) {
			this.$status.set(timer.status);
		}
		if (this.$sessionType.get() !== timer.sessionType) {
			this.$sessionType.set(timer.sessionType);
		}
		if (this.$remainingSeconds.get() !== timer.remainingSeconds) {
			this.$remainingSeconds.set(timer.remainingSeconds);
		}
		if (this.$totalSeconds.get() !== timer.totalSeconds) {
			this.$totalSeconds.set(timer.totalSeconds);
		}
		const prevOvertime = this.$overtimeSeconds.get();
		if (prevOvertime !== timer.overtimeSeconds) {
			this.$overtimeSeconds.set(timer.overtimeSeconds);
		}
		if (this.$sessionsCompleted.get() !== timer.sessionsCompleted) {
			this.$sessionsCompleted.set(timer.sessionsCompleted);
		}
		if (this.$speed.get() !== timer.speed) {
			this.$speed.set(timer.speed);
		}

		// Sync countdown for display; advance once when secondsLeft crosses from >0 to ≤0
		const s = this._settingsCx.$appSettings.get();
		const pomodoro = s.timer.pomodoro;
		if (s.timer.timerMode === 'pomodoro' && pomodoro.autoAdvance && timer.overtimeSeconds > 0) {
			const threshold = pomodoro.autoAdvanceCountdownSeconds;
			const secondsLeft = threshold - timer.overtimeSeconds;
			const prevSecondsLeft = threshold - prevOvertime;
			this.$autoAdvanceCountdownSeconds.set(secondsLeft <= 0 ? null : secondsLeft);
			if (prevSecondsLeft > 0 && secondsLeft <= 0) {
				this.advance();
			}
		} else {
			this.$autoAdvanceCountdownSeconds.set(null);
		}
	}

	// Timer commands

	public async start(intention?: string, profileIds?: number[]): Promise<void> {
		const s = this._settingsCx.$appSettings.get();
		if (s.timer.showSessionSetup && intention == null && profileIds == null) {
			this._navigate({ to: '/window/main/setup', search: { advance: false } });
			return;
		}
		const [ok, , err] = toTuple(
			await specta.commands.startTimer(intention ?? null, profileIds ?? null)
		);
		if (ok) {
			this.$startTime.set(new Date());
		} else {
			console.error('Failed to start timer:', err);
		}
	}

	public async pause(): Promise<void> {
		const [ok, , err] = toTuple(await specta.commands.pauseTimer());
		if (!ok) {
			console.error('Failed to pause timer:', err);
		}
	}

	public async resume(): Promise<void> {
		const [ok, , err] = toTuple(await specta.commands.resumeTimer());
		if (ok) {
			this.$startTime.set(new Date());
		} else {
			console.error('Failed to resume timer:', err);
		}
	}

	public async reset(): Promise<void> {
		const [ok, , err] = toTuple(await specta.commands.resetTimer());
		if (ok) {
			this.$startTime.set(null);
		} else {
			console.error('Failed to reset timer:', err);
		}
	}

	public async advance(intention?: string, profileIds?: number[]): Promise<void> {
		const s = this._settingsCx.$appSettings.get();
		const isBreak = !this.$sessionType.get().endsWith(':work');
		if (s.timer.showSessionSetup && isBreak && intention == null && profileIds == null) {
			this._navigate({ to: '/window/main/setup', search: { advance: true } });
			return;
		}
		const [ok, , err] = toTuple(
			await specta.commands.advanceTimer(intention ?? null, profileIds ?? null)
		);
		if (ok) {
			this.$startTime.set(null);
		} else {
			console.error('Failed to advance timer:', err);
		}
	}

	public async complete(): Promise<void> {
		const [ok, , err] = toTuple(await specta.commands.completeTimer());
		if (ok) {
			this.$startTime.set(null);
		} else {
			console.error('Failed to complete timer:', err);
		}
	}

	public async setDuration(minutes: number): Promise<void> {
		const [ok, , err] = toTuple(await specta.commands.setTimerDuration(minutes));
		if (!ok) {
			console.error('Failed to set timer duration:', err);
		}
	}

	public playSound(id: string): void {
		specta.commands.playSound(id as SoundId);
	}
}

export const TimerCxProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const navigate = useNavigate();
	const settingsCx = useSettingsCx();

	const cx = useMemoCleanup(() => {
		const timerCx = new TimerCx(settingsCx, navigate);
		return [timerCx, () => timerCx.unmount()];
	}, []);

	return <BaseTimerCxProvider value={cx}>{children}</BaseTimerCxProvider>;
};
