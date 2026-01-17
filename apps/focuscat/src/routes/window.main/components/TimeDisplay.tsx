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
		<div className={cn('flex min-h-24 flex-col items-center gap-1', className)}>
			{isOvertime ? (
				<>
					{/* Total time worked */}
					<p className="font-mono text-3xl font-light tracking-wider text-neutral-900">
						{formatTime(state.totalSeconds + state.overtimeSeconds)}
					</p>
					{/* Overtime */}
					<p className="text-sm text-neutral-400">+{formatTime(state.overtimeSeconds)} overtime</p>
				</>
			) : (
				<>
					{/* Remaining time */}
					<p className="font-mono text-3xl font-light tracking-wider text-neutral-900">
						{formatTime(remainingSeconds)}
					</p>
					{/* Time range */}
					<p className="text-sm text-neutral-400">
						{formatTimeOfDay(displayStartTime)} → {formatTimeOfDay(displayEndTime)}
					</p>
				</>
			)}

			{/* Last session stats (subtle, during breaks) */}
			{state.phase !== 'work' && state.lastWorkSession != null && (
				<div className="mt-2 text-center text-xs text-neutral-300">
					<p>{formatTime(state.lastWorkSession.completedSeconds)} last session</p>
					{/* Debug: show breakdown */}
					{debug &&
						(state.lastWorkSession.extendedSeconds > 0 ||
							state.lastWorkSession.overtimeSeconds > 0) && (
							<p>
								({formatTime(state.lastWorkSession.baseSeconds)} base
								{state.lastWorkSession.extendedSeconds > 0 &&
									` + ${formatTime(state.lastWorkSession.extendedSeconds)} ext`}
								{state.lastWorkSession.overtimeSeconds > 0 &&
									` + ${formatTime(state.lastWorkSession.overtimeSeconds)} ot`}
								)
							</p>
						)}
				</div>
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
