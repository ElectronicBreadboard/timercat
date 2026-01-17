import { useFeatureState } from 'feature-react/state';
import React from 'react';
import { useSettingsCx } from '@/features/settings';
import { useTimerCx } from '@/features/timer';
import { cn } from '@/lib';
import { TimeDisplay } from './TimeDisplay';
import { TimerActions } from './TimerActions';
import { TimerDial } from './TimerDial';

export const TimerView: React.FC<TTimerViewProps> = (props) => {
	const { onTick, className, style } = props;
	const timerCx = useTimerCx();
	const timer = useFeatureState(timerCx.$timer);
	const startTime = useFeatureState(timerCx.$startTime);
	const settingsCx = useSettingsCx();
	const settings = useFeatureState(settingsCx.$appSettings);

	const [dragMinutes, setDragMinutes] = React.useState<number | null>(null);
	const wasRunning = React.useRef(false);
	const isDragging = dragMinutes != null;
	const isRunning = timer?.status === 'running';
	const isActive = timer != null && timer.status !== 'idle';
	const lastTickValue = React.useRef<number | null>(null);

	// Display values: fractional when active (smooth animation), whole when idle (snap to minutes)
	const { displayMinutes, displaySeconds } = React.useMemo(() => {
		if (dragMinutes != null) {
			return { displayMinutes: dragMinutes, displaySeconds: dragMinutes * 60 };
		}
		if (timer == null) {
			return { displayMinutes: 0, displaySeconds: 0 };
		}
		const minutes = isActive ? timer.remainingSeconds / 60 : Math.ceil(timer.remainingSeconds / 60);
		return { displayMinutes: minutes, displaySeconds: timer.remainingSeconds };
	}, [dragMinutes, timer, isActive]);

	// Session progress: each session spans 0→1, split into work (0→0.5) and break (0.5→1.0)
	const sessionProgress = React.useMemo(() => {
		if (timer == null || timer.status === 'idle') {
			return 0;
		}
		const { totalSeconds, remainingSeconds, sessionsCompleted, phase } = timer;
		const phaseProgress = totalSeconds > 0 ? (totalSeconds - remainingSeconds) / totalSeconds : 0;

		// Work fills first half (0→0.5), break fills second half (0.5→1.0)
		return phase === 'work'
			? sessionsCompleted + phaseProgress * 0.5
			: sessionsCompleted + 0.5 + phaseProgress * 0.5;
	}, [timer]);

	// MARK: - Actions

	const handleDragStart = React.useCallback(() => {
		wasRunning.current = isRunning ?? false;
		if (isRunning) {
			timerCx.pause();
		}
	}, [isRunning, timerCx]);

	const handleDragMove = React.useCallback((minutes: number) => {
		setDragMinutes(minutes);
	}, []);

	const handleDragEnd = React.useCallback(
		(minutes: number) => {
			setDragMinutes(null);
			timerCx.setDurationMinutes(minutes);
			if (wasRunning.current) {
				timerCx.resume();
			}
		},
		[timerCx]
	);

	// MARK: - Effects

	React.useEffect(() => {
		if (timer == null) {
			lastTickValue.current = null;
			return;
		}

		if (isDragging) {
			// During drag: tick on minute boundaries
			const minute = Math.round(dragMinutes);
			if (lastTickValue.current != null && lastTickValue.current !== minute) {
				onTick?.(true);
			}
			lastTickValue.current = minute;
		} else if (isRunning) {
			// During countdown: tick every second
			const second = timer.remainingSeconds;
			if (lastTickValue.current != null && lastTickValue.current !== second) {
				onTick?.(false);
			}
			lastTickValue.current = second;
		} else {
			lastTickValue.current = null;
		}
	}, [isDragging, dragMinutes, isRunning, timer, onTick]);

	// MARK: - UI

	if (timer == null) {
		return (
			<div className={cn('flex items-center justify-center', className)} style={style}>
				<p className="text-neutral-400">Loading...</p>
			</div>
		);
	}

	return (
		<div className={cn('flex flex-col items-center pb-4', className)} style={style}>
			<TimerDial
				value={displayMinutes}
				sessionProgress={sessionProgress}
				sessionsBeforeLongBreak={settings.sessionsBeforeLongBreak}
				smooth={isActive && !isDragging}
				onDragStart={handleDragStart}
				onDragMove={handleDragMove}
				onDragEnd={handleDragEnd}
			/>

			<TimeDisplay
				state={timer}
				remainingSeconds={displaySeconds}
				isRunning={isRunning ?? false}
				startTime={startTime}
				endTime={timerCx.getEndTime()}
				debug={settings.debug}
				className="mt-4"
			/>

			<TimerActions
				status={timer.status}
				phase={timer.phase}
				onStart={timerCx.start}
				onSkip={timerCx.skip}
				onPause={timerCx.pause}
				onResume={timerCx.resume}
				onCancel={timerCx.reset}
				className="mt-auto"
			/>
		</div>
	);
};

interface TTimerViewProps {
	/** Fires every second when running, every minute boundary when dragging */
	onTick?: (isDragging: boolean) => void;
	className?: string;
	style?: React.CSSProperties;
}
