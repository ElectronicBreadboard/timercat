import { createState } from 'feature-state';
import React from 'react';
import { specta } from '@/environment';
import { useMemoCleanup } from '@/hooks';
import { toTuple } from '@/lib';

// MARK: - Context

const TimerCx = React.createContext<TTimerCx | null>(null);

export const TimerCxProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const cx = useMemoCleanup(() => {
		const timerCx = createTimerCx();
		timerCx.mount();
		return [timerCx, () => timerCx.unmount()];
	}, []);

	return <TimerCx.Provider value={cx}>{children}</TimerCx.Provider>;
};

export function useTimerCx(): TTimerCx {
	const cx = React.useContext(TimerCx);
	if (cx == null) {
		throw new Error('useTimerCx must be used within a TimerProvider');
	}
	return cx;
}

// MARK: - Factory

function createTimerCx(): TTimerCx {
	const $timer = createState<specta.TimerDto | null>(null);
	const $startTime = createState<Date | null>(null);

	let unlistenUpdate: (() => void) | undefined;

	return {
		$timer,
		$startTime,

		getEndTime() {
			const timer = $timer.get();
			if (timer == null || timer.status !== 'running' || timer.remainingSeconds <= 0) {
				return null;
			}
			return new Date(Date.now() + timer.remainingSeconds * 1000);
		},

		async mount() {
			$timer.set(await specta.commands.getTimer());

			unlistenUpdate = await specta.events.timerUpdatedEvent.listen((event) => {
				$timer.set(event.payload);
			});
		},

		unmount() {
			unlistenUpdate?.();
		},

		async start() {
			const [ok, , err] = toTuple(await specta.commands.startTimer());
			if (ok) {
				$startTime.set(new Date());
			} else {
				console.error('Failed to start timer:', err);
			}
		},

		async pause() {
			const [ok, , err] = toTuple(await specta.commands.pauseTimer());
			if (!ok) {
				console.error('Failed to pause timer:', err);
			}
		},

		async resume() {
			const [ok, , err] = toTuple(await specta.commands.resumeTimer());
			if (ok) {
				$startTime.set(new Date());
			} else {
				console.error('Failed to resume timer:', err);
			}
		},

		async reset() {
			const [ok, , err] = toTuple(await specta.commands.resetTimer());
			if (ok) {
				$startTime.set(null);
			} else {
				console.error('Failed to reset timer:', err);
			}
		},

		async skip() {
			const [ok, , err] = toTuple(await specta.commands.skipTimer());
			if (ok) {
				$startTime.set(null);
			} else {
				console.error('Failed to skip timer:', err);
			}
		},

		async setDurationMinutes(minutes: number) {
			const [ok, , err] = toTuple(await specta.commands.setTimerDuration(minutes));
			if (!ok) {
				console.error('Failed to set timer duration:', err);
			}
		}
	};
}

export { createTimerCx };

export interface TTimerCx {
	$timer: ReturnType<typeof createState<specta.TimerDto | null>>;
	$startTime: ReturnType<typeof createState<Date | null>>;

	getEndTime: () => Date | null;

	mount: () => Promise<void>;
	unmount: () => void;

	start: () => Promise<void>;
	pause: () => Promise<void>;
	resume: () => Promise<void>;
	reset: () => Promise<void>;
	skip: () => Promise<void>;
	setDurationMinutes: (minutes: number) => Promise<void>;
}
