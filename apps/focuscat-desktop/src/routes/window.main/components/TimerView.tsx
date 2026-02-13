import { useFeatureState, useListener } from 'feature-react/state';
import React from 'react';
import { Badge } from '@/components';
import { useSettingsCx } from '@/features/settings';
import { useTimerCx } from '@/features/timer';
import { cn } from '@/lib';
import { CountdownTimerActions } from './CountdownTimerActions';
import { CountdownTimerDial } from './CountdownTimerDial';
import { PomodoroTimerActions } from './PomodoroTimerActions';
import { PomodoroTimerDial } from './PomodoroTimerDial';
import { TimeDisplay } from './TimeDisplay';

export const TimerView: React.FC<TTimerViewProps> = (props) => {
	const { onTick, className, style } = props;
	const timerCx = useTimerCx();
	const settingsCx = useSettingsCx();
	const settings = useFeatureState(settingsCx.$appSettings);
	const speed = useFeatureState(timerCx.$speed);

	const [previewMinutes, setPreviewMinutes] = React.useState<number | null>(null);
	const lastPreviewMinute = React.useRef<number | null>(null);
	const lastCountdownSecond = React.useRef<number | null>(null);

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
	const lastTimerMode = React.useRef(settings.timer.timerMode);
	React.useEffect(() => {
		if (lastTimerMode.current !== settings.timer.timerMode) {
			timerCx.reset();
			lastTimerMode.current = settings.timer.timerMode;
		}
	}, [settings.timer.timerMode, timerCx]);

	// Countdown tick handler - fires every second when running
	useListener(
		timerCx.$remainingSeconds,
		({ value: remainingSeconds }) => {
			const status = timerCx.$status.get();

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
			{settings.timer.timerMode === 'countdown' ? (
				<CountdownTimerDial
					cx={timerCx}
					previewMinutes={previewMinutes}
					onPreviewChange={handlePreviewChange}
				/>
			) : (
				<PomodoroTimerDial
					cx={timerCx}
					previewMinutes={previewMinutes}
					sessionsBeforeLongBreak={settings.timer.pomodoro.sessionsBeforeLongBreak}
					onPreviewChange={handlePreviewChange}
				/>
			)}

			<TimeDisplay cx={timerCx} previewMinutes={previewMinutes} className="mt-4" />

			{settings.features.debug && speed > 1 && (
				<Badge variant="warning" className="mt-1 font-mono">
					{speed}x
				</Badge>
			)}

			{settings.timer.timerMode === 'countdown' ? (
				<CountdownTimerActions cx={timerCx} className="mt-auto" />
			) : (
				<PomodoroTimerActions cx={timerCx} className="mt-auto" />
			)}
		</div>
	);
};

interface TTimerViewProps {
	/** Fires every second when running, every minute boundary when previewing */
	onTick?: (isPreviewing: boolean) => void;
	className?: string;
	style?: React.CSSProperties;
}
