import { useCombinedCompute } from 'feature-react/state';
import React from 'react';
import { type TimerCx } from '@/features/timer';
import { cn, formatTime, formatTimeOfDay } from '@/lib';

export const TimeDisplay: React.FC<TTimeDisplayProps> = (props) => {
	const { cx, className } = props;

	const { isOvertime, displaySeconds, displayStartTime, displayEndTime } = useCombinedCompute(
		[
			cx.$status,
			cx.$remainingSeconds,
			cx.$overtimeSeconds,
			cx.$previewMinutes,
			cx.$startTime
		] as const,
		([
			{ value: status = 'idle' },
			{ value: remainingSeconds = 0 },
			{ value: overtimeSeconds = 0 },
			{ value: previewMinutes = null },
			{ value: startTime = null }
		]) => {
			const isRunning = status === 'running';
			const isOvertime = remainingSeconds === 0 && overtimeSeconds > 0;
			const displaySeconds = previewMinutes != null ? previewMinutes * 60 : remainingSeconds;
			const endTime =
				isRunning && remainingSeconds > 0 ? new Date(Date.now() + remainingSeconds * 1000) : null;

			const now = new Date();
			const displayStartTime = isRunning && startTime != null ? startTime : now;
			const displayEndTime =
				isRunning && endTime != null ? endTime : new Date(now.getTime() + displaySeconds * 1000);

			return { isOvertime, displaySeconds, displayStartTime, displayEndTime };
		},
		[],
		{
			isEqual: (a, b) =>
				a.isOvertime === b.isOvertime &&
				a.displaySeconds === b.displaySeconds &&
				a.displayStartTime.getTime() === b.displayStartTime.getTime() &&
				a.displayEndTime.getTime() === b.displayEndTime.getTime()
		}
	);
	const { totalWorked, overtimeSeconds } = useCombinedCompute(
		[cx.$totalSeconds, cx.$overtimeSeconds] as const,
		([{ value: totalSeconds = 0 }, { value: overtimeSeconds = 0 }]) => ({
			totalWorked: totalSeconds + overtimeSeconds,
			overtimeSeconds
		}),
		[],
		{
			isEqual: (a, b) => a.totalWorked === b.totalWorked && a.overtimeSeconds === b.overtimeSeconds
		}
	);

	// MARK: - UI

	return (
		<div className={cn('flex flex-col items-center gap-1', className)}>
			{isOvertime ? (
				<>
					{/* Total time worked */}
					<p className="text-base-900 font-mono text-3xl font-light tracking-wider">
						{formatTime(totalWorked)}
					</p>
					{/* Overtime */}
					<p className="text-warning text-sm">+{formatTime(overtimeSeconds)} overtime</p>
				</>
			) : (
				<>
					{/* Remaining time */}
					<p className="text-base-900 font-mono text-3xl font-light tracking-wider">
						{formatTime(displaySeconds)}
					</p>
					{/* Time range */}
					<p className="text-base-400 text-sm">
						{formatTimeOfDay(displayStartTime)} → {formatTimeOfDay(displayEndTime)}
					</p>
				</>
			)}
		</div>
	);
};

interface TTimeDisplayProps {
	cx: TimerCx;
	className?: string;
}
