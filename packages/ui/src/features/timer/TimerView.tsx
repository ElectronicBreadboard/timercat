import { useFeatureState, useListener } from 'feature-react/state';
import React from 'react';
import { Badge } from '../../components';
import { cn } from '../../lib';
import { CountdownTimerActions } from './CountdownTimerActions';
import { CountdownTimerDial } from './CountdownTimerDial';
import { PomodoroTimerActions } from './PomodoroTimerActions';
import { PomodoroTimerDial } from './PomodoroTimerDial';
import { TimeDisplay } from './TimeDisplay';
import { type TTimerCx } from './TimerCx';

export const TimerView: React.FC<TTimerViewProps> = (props) => {
	const {
		cx,
		timerMode,
		sessionsBeforeLongBreak = 4,
		showDevSpeed = false,
		onTick,
		className,
		style
	} = props;
	const speed = useFeatureState(cx.$speed);

	const [previewMinutes, setPreviewMinutes] = React.useState<number | null>(null);
	const lastPreviewMinute = React.useRef<number | null>(null);
	const lastCountdownSecond = React.useRef<number | null>(null);
	const lastTimerMode = React.useRef(timerMode);

	// MARK: - Actions

	const handlePreviewChange = React.useCallback(
		(minutes: number | null) => {
			setPreviewMinutes(minutes);

			// Tick on minute boundaries during preview
			if (minutes != null) {
				const minute = Math.round(minutes);
				if (lastPreviewMinute.current != null && lastPreviewMinute.current !== minute) {
					onTick?.(true);
				}
				lastPreviewMinute.current = minute;
				lastCountdownSecond.current = null;
			} else {
				lastPreviewMinute.current = null;
			}
		},
		[onTick]
	);

	// MARK: - Effects

	// Reset timer when mode changes
	React.useEffect(() => {
		if (lastTimerMode.current !== timerMode) {
			cx.reset();
			lastTimerMode.current = timerMode;
		}
	}, [timerMode, cx]);

	// Countdown tick handler - fires every second when running
	useListener(
		cx.$remainingSeconds,
		({ value: remainingSeconds }) => {
			const status = cx.$status.get();

			if (previewMinutes == null && status === 'running') {
				if (
					lastCountdownSecond.current != null &&
					lastCountdownSecond.current !== remainingSeconds
				) {
					onTick?.(false);
				}
				lastCountdownSecond.current = remainingSeconds;
			} else if (status !== 'running') {
				lastCountdownSecond.current = null;
			}
		},
		[onTick, previewMinutes]
	);

	// MARK: - UI

	return (
		<div className={cn('flex flex-col items-center pb-8', className)} style={style}>
			{timerMode === 'countdown' ? (
				<CountdownTimerDial
					cx={cx}
					previewMinutes={previewMinutes}
					onPreviewChange={handlePreviewChange}
				/>
			) : (
				<PomodoroTimerDial
					cx={cx}
					previewMinutes={previewMinutes}
					sessionsBeforeLongBreak={sessionsBeforeLongBreak}
					onPreviewChange={handlePreviewChange}
				/>
			)}

			<TimeDisplay cx={cx} previewMinutes={previewMinutes} className="mt-4" />

			{showDevSpeed && speed > 1 && (
				<Badge variant="warning" className="mt-1 font-mono">
					{speed}x
				</Badge>
			)}

			{timerMode === 'countdown' ? (
				<CountdownTimerActions cx={cx} className="mt-auto" />
			) : (
				<PomodoroTimerActions cx={cx} className="mt-auto" />
			)}
		</div>
	);
};

interface TTimerViewProps {
	cx: TTimerCx;
	timerMode: 'countdown' | 'pomodoro';
	sessionsBeforeLongBreak?: number;
	showDevSpeed?: boolean;
	/** Fires every second when running, every minute boundary when previewing */
	onTick?: (isPreviewing: boolean) => void;
	className?: string;
	style?: React.CSSProperties;
}
