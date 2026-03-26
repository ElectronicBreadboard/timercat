import { useNavigate } from '@tanstack/react-router';
import { createState } from 'feature-state';
import { specta } from '@/environment';
import { type SettingsCx } from '@/features/settings';
import { toTuple } from '@/lib';

export abstract class BaseTimerCx {
	private _unlisten?: () => void;

	// Async init can finish after unmount (StrictMode/dev remount), so prevent late event subscriptions
	protected _isDisposed = false;
	// Only one window should run timer side effects to avoid duplicate side effects
	protected readonly _enableSideEffects: boolean;

	protected readonly _settingsCx: SettingsCx;
	protected readonly _navigate: ReturnType<typeof useNavigate>;

	public readonly $status = createState<'idle' | 'running' | 'paused'>('idle');
	public readonly $sessionType = createState('pomodoro:work');
	public readonly $remainingSeconds = createState(0);
	public readonly $totalSeconds = createState(0);
	public readonly $overtimeSeconds = createState(0);
	public readonly $sessionsCompleted = createState(0);
	public readonly $startedAt = createState<Date | null>(null);

	constructor(
		settingsCx: SettingsCx,
		navigate: ReturnType<typeof useNavigate>,
		enableSideEffects: boolean
	) {
		this._settingsCx = settingsCx;
		this._navigate = navigate;
		this._enableSideEffects = enableSideEffects;
		this._init();
	}

	private async _init(): Promise<void> {
		if (this._isDisposed) return;
		const timer = await specta.commands.getTimer();
		if (this._isDisposed) return;
		this.applyTimerUpdate(timer);
		const unlisten = await specta.events.timerUpdatedEvent.listen((event) => {
			if (this._isDisposed) return;
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

	protected applyTimerUpdate(timer: specta.TimerDto): void {
		if (this.$status.get() !== timer.status) this.$status.set(timer.status);
		if (this.$sessionType.get() !== timer.sessionType) this.$sessionType.set(timer.sessionType);
		if (this.$remainingSeconds.get() !== timer.remainingSeconds)
			this.$remainingSeconds.set(timer.remainingSeconds);
		if (this.$totalSeconds.get() !== timer.totalSeconds) this.$totalSeconds.set(timer.totalSeconds);
		if (this.$overtimeSeconds.get() !== timer.overtimeSeconds)
			this.$overtimeSeconds.set(timer.overtimeSeconds);
		if (this.$sessionsCompleted.get() !== timer.sessionsCompleted)
			this.$sessionsCompleted.set(timer.sessionsCompleted);
	}

	public async pause(): Promise<void> {
		const [ok, , err] = toTuple(await specta.commands.pauseTimer());
		if (!ok) console.error('Failed to pause timer:', err);
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
		if (!ok) console.error('Failed to set timer duration:', err);
	}
}
