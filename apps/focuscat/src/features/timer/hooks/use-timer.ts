import React from 'react';
import { specta } from '@/environment';
import { useAppSettings, useTimerState } from '@/hooks';
import { toTuple } from '@/lib';
import { timerConfig } from '../timer.config';

export function useTimer(): TUseTimerReturn {
	const state = useTimerState();
	const [settings] = useAppSettings();
	const [categories] = React.useState<specta.FocusCategory[]>(timerConfig.categories);
	const [startTime, setStartTime] = React.useState<Date | null>(null);

	const endTime = React.useMemo(() => {
		if (startTime == null || state == null || state.status !== 'running') {
			return null;
		}
		return new Date(startTime.getTime() + state.remainingSeconds * 1000);
	}, [startTime, state]);

	// MARK: - Actions

	const start = React.useCallback(async () => {
		const [isOk, , error] = toTuple(await specta.commands.startTimer());
		if (isOk) {
			setStartTime(new Date());
		} else {
			console.error('Failed to start timer:', error);
		}
	}, []);

	const pause = React.useCallback(async () => {
		const [isOk, , error] = toTuple(await specta.commands.pauseTimer());
		if (!isOk) {
			console.error('Failed to pause timer:', error);
		}
	}, []);

	const resume = React.useCallback(async () => {
		const [isOk, , error] = toTuple(await specta.commands.resumeTimer());
		if (isOk) {
			setStartTime(new Date());
		} else {
			console.error('Failed to resume timer:', error);
		}
	}, []);

	const reset = React.useCallback(async () => {
		const [isOk, , error] = toTuple(await specta.commands.resetTimer());
		if (isOk) {
			setStartTime(null);
		} else {
			console.error('Failed to reset timer:', error);
		}
	}, []);

	const skip = React.useCallback(async () => {
		const [isOk, , error] = toTuple(await specta.commands.skipTimer());
		if (isOk) {
			setStartTime(null);
		} else {
			console.error('Failed to skip timer:', error);
		}
	}, []);

	const setDurationMinutes = React.useCallback(async (minutes: number) => {
		const [isOk, , error] = toTuple(await specta.commands.setTimerDuration(minutes));
		if (!isOk) {
			console.error('Failed to set timer duration:', error);
		}
	}, []);

	const setCategory = React.useCallback(async (category: specta.FocusCategory | null) => {
		const [isOk, , error] = toTuple(await specta.commands.setTimerCategory(category));
		if (!isOk) {
			console.error('Failed to set timer category:', error);
		}
	}, []);

	const setTargetSessions = React.useCallback(async (sessions: number) => {
		const [isOk, , error] = toTuple(await specta.commands.setTargetSessions(sessions));
		if (!isOk) {
			console.error('Failed to set target sessions:', error);
		}
	}, []);

	const cycleSpeed = React.useCallback(async () => {
		const [isOk, , error] = toTuple(await specta.commands.cycleTimerSpeed());
		if (!isOk) {
			console.error('Failed to cycle timer speed:', error);
		}
	}, []);

	// MARK: - Effects

	React.useEffect(() => {
		const unsub = specta.events.timerCompleteEvent.listen(() => {
			setStartTime(null);
		});

		return () => {
			unsub.then((u) => u());
		};
	}, []);

	return {
		state,
		settings,
		categories,
		startTime,
		endTime,
		start,
		pause,
		resume,
		reset,
		skip,
		setDurationMinutes,
		setCategory,
		setTargetSessions,
		cycleSpeed
	};
}

interface TUseTimerReturn {
	state: specta.Timer | null;
	settings: specta.AppSettings;
	categories: specta.FocusCategory[];
	startTime: Date | null;
	endTime: Date | null;
	start: () => void;
	pause: () => void;
	resume: () => void;
	reset: () => void;
	skip: () => void;
	setDurationMinutes: (minutes: number) => void;
	setCategory: (category: specta.FocusCategory | null) => void;
	setTargetSessions: (sessions: number) => void;
	cycleSpeed: () => void;
}
