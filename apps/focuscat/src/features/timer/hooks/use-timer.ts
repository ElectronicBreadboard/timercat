import React from 'react';
import { timerConfig } from '../timer.config';
import type { TFocusCategory, TTimerPhase, TTimerSettings, TTimerState } from '../types';

export function useTimer(): TUseTimerReturn {
	const [settings] = React.useState<TTimerSettings>(timerConfig.settings);
	const [categories] = React.useState<TFocusCategory[]>(timerConfig.categories);
	const [state, setState] = React.useState<TTimerState>(() => getInitialState(settings));
	const [startTime, setStartTime] = React.useState<Date | null>(null);

	const intervalRef = React.useRef<number | null>(null);

	const endTime = React.useMemo(() => {
		if (startTime == null || state.status !== 'running') return null;
		return new Date(startTime.getTime() + state.remainingSeconds * 1000);
	}, [startTime, state.remainingSeconds, state.status]);

	// MARK: - Actions

	const transitionToNextPhase = React.useCallback(() => {
		setState((prev) => {
			const isWorkPhase = prev.phase === 'work';
			const newSessionsCompleted = isWorkPhase
				? prev.sessionsCompleted + 1
				: prev.sessionsCompleted;

			let nextPhase: TTimerPhase;
			if (isWorkPhase) {
				nextPhase =
					newSessionsCompleted % settings.sessionsBeforeLongBreak === 0
						? 'longBreak'
						: 'shortBreak';
			} else {
				nextPhase = 'work';
			}

			const nextDuration = getDurationForPhase(nextPhase, settings);

			return {
				...prev,
				status: 'idle',
				phase: nextPhase,
				totalSeconds: nextDuration,
				remainingSeconds: nextDuration,
				sessionsCompleted: newSessionsCompleted
			};
		});
		setStartTime(null);
	}, [settings]);

	const tick = React.useCallback(() => {
		setState((prev) => {
			if (prev.remainingSeconds <= 1) {
				if (intervalRef.current != null) {
					clearInterval(intervalRef.current);
					intervalRef.current = null;
				}
				setTimeout(() => transitionToNextPhase(), 0);
				return { ...prev, remainingSeconds: 0, status: 'idle' };
			}
			return { ...prev, remainingSeconds: prev.remainingSeconds - 1 };
		});
	}, [transitionToNextPhase]);

	const start = React.useCallback(() => {
		if (state.status !== 'idle') return;
		setStartTime(new Date());
		setState((prev) => ({ ...prev, status: 'running' }));
		intervalRef.current = window.setInterval(tick, 1000);
	}, [state.status, tick]);

	const pause = React.useCallback(() => {
		if (state.status !== 'running') return;
		if (intervalRef.current != null) {
			clearInterval(intervalRef.current);
			intervalRef.current = null;
		}
		setState((prev) => ({ ...prev, status: 'paused' }));
	}, [state.status]);

	const resume = React.useCallback(() => {
		if (state.status !== 'paused') return;
		setStartTime(new Date());
		setState((prev) => ({ ...prev, status: 'running' }));
		intervalRef.current = window.setInterval(tick, 1000);
	}, [state.status, tick]);

	const reset = React.useCallback(() => {
		if (intervalRef.current != null) {
			clearInterval(intervalRef.current);
			intervalRef.current = null;
		}
		setState((prev) => ({ ...prev, status: 'idle', remainingSeconds: prev.totalSeconds }));
		setStartTime(null);
	}, []);

	const skip = React.useCallback(() => {
		if (intervalRef.current != null) {
			clearInterval(intervalRef.current);
			intervalRef.current = null;
		}
		transitionToNextPhase();
	}, [transitionToNextPhase]);

	const setDurationMinutes = React.useCallback(
		(minutes: number) => {
			if (state.status !== 'idle') return;
			const seconds = minutes * 60;
			setState((prev) => ({ ...prev, totalSeconds: seconds, remainingSeconds: seconds }));
		},
		[state.status]
	);

	const setCategory = React.useCallback((category: TFocusCategory | null) => {
		setState((prev) => ({ ...prev, category }));
	}, []);

	// MARK: - Effects

	React.useEffect(() => {
		return () => {
			if (intervalRef.current != null) clearInterval(intervalRef.current);
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
		setCategory
	};
}

function getInitialState(settings: TTimerSettings): TTimerState {
	return {
		status: 'idle',
		phase: 'work',
		totalSeconds: settings.workDuration,
		remainingSeconds: settings.workDuration,
		category: timerConfig.categories[0] ?? null,
		sessionsCompleted: 0
	};
}

function getDurationForPhase(phase: TTimerPhase, settings: TTimerSettings): number {
	switch (phase) {
		case 'work':
			return settings.workDuration;
		case 'shortBreak':
			return settings.shortBreakDuration;
		case 'longBreak':
			return settings.longBreakDuration;
	}
}

interface TUseTimerReturn {
	state: TTimerState;
	settings: TTimerSettings;
	categories: TFocusCategory[];
	startTime: Date | null;
	endTime: Date | null;
	start: () => void;
	pause: () => void;
	resume: () => void;
	reset: () => void;
	skip: () => void;
	setDurationMinutes: (minutes: number) => void;
	setCategory: (category: TFocusCategory | null) => void;
}
