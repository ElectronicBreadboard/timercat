import { TimerCxProvider as BaseTimerCxProvider, useMemoCleanup, type TTimerCx } from '@repo/ui';
import { useNavigate } from '@tanstack/react-router';
import { createState } from 'feature-state';
import React from 'react';
import { specta } from '@/environment';
import { useSettingsCx, type SettingsCx } from '@/features/settings';
import { toTuple } from '@/lib';

export class TimerCx implements TTimerCx {
	private _unlisten?: () => void;

	// Async init can finish after unmount (StrictMode/dev remount), so prevent late event subscriptions
	private _isDisposed = false;
	// Only one window should run timer side effects to avoid duplicate side effects
	private readonly _enableSideEffects: boolean;

	private readonly _settingsCx: SettingsCx;
	private readonly _navigate: ReturnType<typeof useNavigate>;

	public readonly $status = createState<'idle' | 'running' | 'paused'>('idle');
	public readonly $sessionType = createState('pomodoro:work');
	public readonly $remainingSeconds = createState(0);
	public readonly $totalSeconds = createState(0);
	public readonly $overtimeSeconds = createState(0);
	public readonly $sessionsCompleted = createState(0);
	public readonly $speed = createState(1);
	public readonly $startedAt = createState<Date | null>(null);

	constructor(
		settingsCx: SettingsCx,
		navigate: ReturnType<typeof useNavigate>,
		enableSideEffects: boolean
	) {
		this._settingsCx = settingsCx;
		this._navigate = navigate;
		this._enableSideEffects = enableSideEffects;
		this.init();
	}

	private async init(): Promise<void> {
		if (this._isDisposed) {
			return;
		}
		const timer = await specta.commands.getTimer();
		if (this._isDisposed) {
			return;
		}
		this.applyTimerUpdate(timer);
		const unlisten = await specta.events.timerUpdatedEvent.listen((event) => {
			if (this._isDisposed) {
				return;
			}
			this.applyTimerUpdate(event.payload);
		});
		if (this._isDisposed) {
			unlisten();
			return;
		}
		this._unlisten = unlisten;
	}

	public unmount(): void {
		this._isDisposed = true;
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

		// Auto-advance when overtime reaches threshold
		// Note: Side effects are gated so only one designated owner triggers them in this window runtime
		const s = this._settingsCx.$appSettings.get();
		const pomodoro = s.timer.pomodoro;
		const shouldCountdown =
			this._enableSideEffects &&
			timer.overtimeSeconds > 0 &&
			pomodoro.autoAdvance &&
			s.timer.timerMode === 'pomodoro';
		if (shouldCountdown) {
			const threshold = pomodoro.autoAdvanceCountdownSeconds;
			const crossedThreshold = prevOvertime < threshold && timer.overtimeSeconds >= threshold;
			if (crossedThreshold) {
				void this.advance();
			}
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
			this.$startedAt.set(new Date());
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
			this.$startedAt.set(new Date());
		} else {
			console.error('Failed to resume timer:', err);
		}
	}

	public async reset(): Promise<void> {
		const [ok, , err] = toTuple(await specta.commands.resetTimer());
		if (ok) {
			this.$startedAt.set(null);
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
			this.$startedAt.set(null);
		} else {
			console.error('Failed to advance timer:', err);
		}
	}

	public async complete(): Promise<void> {
		const [ok, , err] = toTuple(await specta.commands.completeTimer());
		if (ok) {
			this.$startedAt.set(null);
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
}

export const TimerCxProvider: React.FC<TTimerCxProviderProps> = (props) => {
	const { children, enableSideEffects = false } = props;
	const navigate = useNavigate();
	const settingsCx = useSettingsCx();

	const cx = useMemoCleanup(() => {
		const timerCx = new TimerCx(settingsCx, navigate, enableSideEffects);
		return [timerCx, () => timerCx.unmount()];
	}, []);

	return <BaseTimerCxProvider value={cx}>{children}</BaseTimerCxProvider>;
};

interface TTimerCxProviderProps {
	children: React.ReactNode;
	enableSideEffects?: boolean;
}
