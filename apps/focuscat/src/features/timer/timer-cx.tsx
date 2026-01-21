import { createState } from 'feature-state';
import React from 'react';
import { specta } from '@/environment';
import { useMemoCleanup } from '@/hooks';
import { toTuple } from '@/lib';

export class TimerCx {
	private _unlisten?: () => void;

	public readonly $status = createState<specta.TimerStatus>('idle');
	public readonly $phase = createState<specta.Phase>('work');
	public readonly $remainingSeconds = createState(0);
	public readonly $totalSeconds = createState(0);
	public readonly $overtimeSeconds = createState(0);
	public readonly $sessionsCompleted = createState(0);
	public readonly $speed = createState(1);
	public readonly $lastWorkSession = createState<specta.WorkSessionStats | null>(null);

	private _wasRunningBeforePreview = false;
	public readonly $previewMinutes = createState<number | null>(null);
	public readonly $startTime = createState<Date | null>(null);

	public get isRunning(): boolean {
		return this.$status.get() === 'running';
	}

	constructor() {
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
		if (this.$phase.get() !== timer.phase) {
			this.$phase.set(timer.phase);
		}
		if (this.$remainingSeconds.get() !== timer.remainingSeconds) {
			this.$remainingSeconds.set(timer.remainingSeconds);
		}
		if (this.$totalSeconds.get() !== timer.totalSeconds) {
			this.$totalSeconds.set(timer.totalSeconds);
		}
		if (this.$overtimeSeconds.get() !== timer.overtimeSeconds) {
			this.$overtimeSeconds.set(timer.overtimeSeconds);
		}
		if (this.$sessionsCompleted.get() !== timer.sessionsCompleted) {
			this.$sessionsCompleted.set(timer.sessionsCompleted);
		}
		if (this.$speed.get() !== timer.speed) {
			this.$speed.set(timer.speed);
		}
		if (this.$lastWorkSession.get() !== timer.lastWorkSession) {
			this.$lastWorkSession.set(timer.lastWorkSession);
		}
	}

	// Timer commands

	public async start(): Promise<void> {
		const [ok, , err] = toTuple(await specta.commands.startTimer());
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

	public async skip(): Promise<void> {
		const [ok, , err] = toTuple(await specta.commands.skipTimer());
		if (ok) {
			this.$startTime.set(null);
		} else {
			console.error('Failed to skip timer:', err);
		}
	}

	public async finish(): Promise<void> {
		const [ok, , err] = toTuple(await specta.commands.finishTimer());
		if (ok) {
			this.$startTime.set(null);
		} else {
			console.error('Failed to finish timer:', err);
		}
	}

	// Preview (time adjustment via dial drag)

	public startPreview(): void {
		this._wasRunningBeforePreview = this.isRunning;
		if (this._wasRunningBeforePreview) {
			specta.commands.pauseTimer();
		}
	}

	public updatePreview(minutes: number): void {
		this.$previewMinutes.set(minutes);
	}

	public async commitPreview(minutes: number): Promise<void> {
		this.$previewMinutes.set(null);
		await specta.commands.setTimerDuration(minutes);
		if (this._wasRunningBeforePreview) {
			const [ok] = toTuple(await specta.commands.resumeTimer());
			if (ok) {
				this.$startTime.set(new Date());
			}
		}
		this._wasRunningBeforePreview = false;
	}
}

const ReactTimerCx = React.createContext<TimerCx | null>(null);

export const TimerCxProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const cx = useMemoCleanup(() => {
		const timerCx = new TimerCx();
		return [timerCx, () => timerCx.unmount()];
	}, []);

	return <ReactTimerCx.Provider value={cx}>{children}</ReactTimerCx.Provider>;
};

export function useTimerCx(): TimerCx {
	const cx = React.useContext(ReactTimerCx);
	if (cx == null) {
		throw new Error('useTimerCx must be used within a TimerCxProvider');
	}
	return cx;
}
