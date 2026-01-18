import React from 'react';
import { specta } from '@/environment';
import { cn, formatTime, formatTimeOfDay } from '@/lib';

export const TimeDisplay: React.FC<TTimeDisplayProps> = (props) => {
	const {
		state,
		remainingSeconds,
		isRunning,
		startTime,
		endTime,
		debug = false,
		className
	} = props;

	const isOvertime = React.useMemo(
		() => state.remainingSeconds === 0 && state.overtimeSeconds > 0,
		[state]
	);

	// Time range: show actual times when running, estimated otherwise
	const { displayStartTime, displayEndTime } = React.useMemo(() => {
		const now = new Date();
		const start = isRunning && startTime != null ? startTime : now;
		const end =
			isRunning && endTime != null ? endTime : new Date(now.getTime() + remainingSeconds * 1000);
		return { displayStartTime: start, displayEndTime: end };
	}, [isRunning, startTime, endTime, remainingSeconds]);

	return (
		<div className={cn('flex flex-col items-center gap-1', className)}>
			{isOvertime ? (
				<>
					{/* Total time worked */}
					<p className="font-mono text-3xl font-light tracking-wider text-gray-900">
						{formatTime(state.totalSeconds + state.overtimeSeconds)}
					</p>
					{/* Overtime */}
					<p className="text-sm text-gray-400">+{formatTime(state.overtimeSeconds)} overtime</p>
				</>
			) : (
				<>
					{/* Remaining time */}
					<p className="font-mono text-3xl font-light tracking-wider text-gray-900">
						{formatTime(remainingSeconds)}
					</p>
					{/* Time range */}
					<p className="text-sm text-gray-400">
						{formatTimeOfDay(displayStartTime)} → {formatTimeOfDay(displayEndTime)}
					</p>
				</>
			)}
		</div>
	);
};

interface TTimeDisplayProps {
	state: specta.Timer;
	remainingSeconds: number;
	isRunning: boolean;
	startTime: Date | null;
	endTime: Date | null;
	debug?: boolean;
	className?: string;
}
