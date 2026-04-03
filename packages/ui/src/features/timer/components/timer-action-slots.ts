import { type TCountdownCx, type TPomodoroCx, type TProgressivePomodoroCx } from '../modes';
import { type TimerStatus } from '../types';

export function getCountdownTimerActionSlots(
	cx: TCountdownCx,
	status: TimerStatus,
	isOvertime: boolean
): TTimerActionSlots {
	const handleStart = () => cx.start();
	const handlePause = () => cx.pause();
	const handleResume = () => cx.resume();
	const handleComplete = () => cx.complete();
	const handleCancel = () => cx.reset();

	if (status === 'idle') {
		return {
			left: null,
			center: { kind: 'start', label: 'START', onClick: handleStart },
			right: null
		};
	}

	if (isOvertime) {
		return {
			left: null,
			center: { kind: 'complete', onClick: handleComplete },
			right: {
				kind: status === 'running' ? 'pause' : 'resume',
				onClick: status === 'running' ? handlePause : handleResume
			}
		};
	}

	if (status === 'running') {
		return {
			left: null,
			center: { kind: 'pause', onClick: handlePause },
			right: null
		};
	}

	return {
		left: { kind: 'cancel', onClick: handleCancel },
		center: { kind: 'resume', onClick: handleResume },
		right: null
	};
}

export function getPomodoroTimerActionSlots(
	cx: TPomodoroCx,
	status: TimerStatus,
	isBreak: boolean,
	isOvertime: boolean
): TTimerActionSlots {
	const handleStart = () => cx.start();
	const handleAdvance = () => cx.advance();
	const handlePause = () => cx.pause();
	const handleResume = () => cx.resume();
	const handleComplete = () => cx.complete();
	const handleCancel = () => cx.reset();

	if (status === 'idle') {
		return {
			left: null,
			center: { kind: 'start', label: 'START SESSION', onClick: handleStart },
			right: null
		};
	}

	if (isOvertime) {
		return {
			left: { kind: 'complete', onClick: handleComplete },
			center: {
				kind: 'advance',
				advanceTo: isBreak ? 'focus' : 'break',
				onClick: handleAdvance
			},
			right: {
				kind: status === 'running' ? 'pause' : 'resume',
				onClick: status === 'running' ? handlePause : handleResume
			}
		};
	}

	if (status === 'running') {
		return {
			left: null,
			center: { kind: 'pause', onClick: handlePause },
			right: null
		};
	}

	return {
		left: { kind: 'cancel', onClick: handleCancel },
		center: { kind: 'resume', onClick: handleResume },
		right: {
			kind: 'advance',
			advanceTo: isBreak ? 'focus' : 'break',
			onClick: handleAdvance
		}
	};
}

export function getProgressiveTimerActionSlots(
	cx: TProgressivePomodoroCx,
	status: TimerStatus,
	isBreak: boolean,
	isOvertime: boolean
): TTimerActionSlots {
	const handleStart = () => cx.start();
	const handleAdvance = () => cx.advance();
	const handlePause = () => cx.pause();
	const handleResume = () => cx.resume();
	const handleComplete = () => cx.complete();
	const handleCancel = () => cx.reset();

	if (status === 'idle') {
		return {
			left: null,
			center: { kind: 'start', label: 'START SESSION', onClick: handleStart },
			right: null
		};
	}

	if (isOvertime) {
		return {
			left: { kind: 'complete', onClick: handleComplete },
			center: {
				kind: 'advance',
				advanceTo: isBreak ? 'focus' : 'break',
				onClick: handleAdvance
			},
			right: {
				kind: status === 'running' ? 'pause' : 'resume',
				onClick: status === 'running' ? handlePause : handleResume
			}
		};
	}

	if (status === 'running') {
		return {
			left: null,
			center: { kind: 'pause', onClick: handlePause },
			right: null
		};
	}

	return {
		left: { kind: 'cancel', onClick: handleCancel },
		center: { kind: 'resume', onClick: handleResume },
		right: {
			kind: 'advance',
			advanceTo: isBreak ? 'focus' : 'break',
			onClick: handleAdvance
		}
	};
}

export interface TTimerActionSlots {
	left: TTimerActionSlot | null;
	center: TTimerActionSlot | null;
	right: TTimerActionSlot | null;
}

export type TTimerActionSlot =
	| {
			kind: 'start';
			label: string;
			onClick: () => void;
	  }
	| {
			kind: 'pause' | 'resume' | 'complete' | 'cancel';
			onClick: () => void;
	  }
	| {
			kind: 'advance';
			advanceTo: 'focus' | 'break';
			onClick: () => void;
	  };
