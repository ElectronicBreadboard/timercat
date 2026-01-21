import { useFeatureState, useListener } from 'feature-react/state';
import React from 'react';
import { Badge } from '@/components';
import { useSettingsCx } from '@/features/settings';
import { useTimerCx } from '@/features/timer';
import { cn } from '@/lib';
import { TimeDisplay } from './TimeDisplay';
import { TimerActions } from './TimerActions';
import { TimerDial } from './TimerDial';

export const TimerView: React.FC<TTimerViewProps> = (props) => {
	const { onTick, className, style } = props;
	const timerCx = useTimerCx();
	const settingsCx = useSettingsCx();
	const settings = useFeatureState(settingsCx.$appSettings);
	const speed = useFeatureState(timerCx.$speed);

	const lastPreviewMinute = React.useRef<number | null>(null);
	const lastCountdownSecond = React.useRef<number | null>(null);

	// MARK: - Effects

	// Preview tick handler - fires on minute boundaries during dial drag
	useListener(
		timerCx.$previewMinutes,
		({ value: previewMinutes }) => {
			if (previewMinutes != null) {
				const minute = Math.round(previewMinutes);
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

	// Countdown tick handler - fires every second when running
	useListener(
		timerCx.$remainingSeconds,
		({ value: remainingSeconds }) => {
			const previewMinutes = timerCx.$previewMinutes.get();
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
		[onTick]
	);

	// MARK: - UI

	return (
		<div className={cn('flex flex-col items-center pb-4', className)} style={style}>
			<TimerDial cx={timerCx} sessionsBeforeLongBreak={settings.timer.sessionsBeforeLongBreak} />

			<TimeDisplay cx={timerCx} className="mt-4" />

			{settings.debug.enabled && speed > 1 && (
				<Badge variant="warning" className="mt-1 font-mono">
					{speed}x
				</Badge>
			)}

			<TimerActions cx={timerCx} className="mt-auto" />
		</div>
	);
};

interface TTimerViewProps {
	/** Fires every second when running, every minute boundary when previewing */
	onTick?: (isPreviewing: boolean) => void;
	className?: string;
	style?: React.CSSProperties;
}
