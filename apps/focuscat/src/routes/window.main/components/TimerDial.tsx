import { useCombinedCompute } from 'feature-react/state';
import React from 'react';
import { TriangleDownIcon, TriangleRightIcon } from '@/components';
import { type TimerCx } from '@/features/timer';
import { SessionWheel } from './SessionWheel';
import { TimeWheel } from './TimeWheel';

export const TimerDial: React.FC<TTimerDialProps> = (props) => {
	const { cx, sessionsBeforeLongBreak } = props;

	const { value, smooth } = useCombinedCompute(
		[cx.$status, cx.$remainingSeconds, cx.$previewMinutes] as const,
		([
			{ value: status = 'idle' },
			{ value: remainingSeconds = 0 },
			{ value: previewMinutes = null }
		]) => {
			const isActive = status !== 'idle';
			const isPreviewing = previewMinutes != null;

			// Display minutes: fractional when active (smooth animation), whole when idle
			const displayMinutes = isActive ? remainingSeconds / 60 : Math.ceil(remainingSeconds / 60);

			return {
				value: isPreviewing ? previewMinutes : displayMinutes,
				smooth: isActive && !isPreviewing
			};
		},
		[],
		{ isEqual: (a, b) => a.value === b.value && a.smooth === b.smooth }
	);
	const sessionProgress = useCombinedCompute(
		[cx.$status, cx.$phase, cx.$remainingSeconds, cx.$totalSeconds, cx.$sessionsCompleted] as const,
		([
			{ value: status = 'idle' },
			{ value: phase = 'work' },
			{ value: remainingSeconds = 0 },
			{ value: totalSeconds = 0 },
			{ value: sessionsCompleted = 0 }
		]) => {
			if (status === 'idle') {
				return 0;
			}

			// Session progress: each session spans 0→1, split into work (0→0.5) and break (0.5→1.0)
			const phaseProgress = totalSeconds > 0 ? (totalSeconds - remainingSeconds) / totalSeconds : 0;
			return phase === 'work'
				? sessionsCompleted + phaseProgress * 0.5
				: sessionsCompleted - 0.5 + phaseProgress * 0.5;
		}
	);

	// MARK: - UI

	return (
		<div className="relative flex w-full items-center">
			{/* Border lines */}
			<div className="bg-base-200 absolute inset-x-0 top-0 z-20 h-px" />
			<div className="bg-base-200 absolute inset-x-0 bottom-0 z-20 h-px" />

			{/* Time wheel */}
			<div className="relative ml-2 flex-1">
				<TimeWheel
					value={value}
					smooth={smooth}
					onDragStart={() => cx.startPreview()}
					onDragMove={(m) => cx.updatePreview(m)}
					onDragEnd={(m) => cx.commitPreview(m)}
				/>

				{/* Edge fades */}
				<div className="from-base-0 pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-linear-to-r to-transparent" />
				<div className="from-base-0 pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-linear-to-l to-transparent" />

				{/* Center indicator */}
				<div className="pointer-events-none absolute inset-x-0 top-px z-30 flex justify-center">
					<TriangleDownIcon
						width={12}
						height={8}
						preserveAspectRatio="none"
						className="text-base-300"
					/>
				</div>
			</div>

			{/* Divider */}
			<div className="bg-base-200 h-16 w-px" />

			{/* Session wheel */}
			<div className="relative mr-2">
				<SessionWheel value={sessionProgress} sessionsBeforeLongBreak={sessionsBeforeLongBreak} />

				{/* Edge fades */}
				<div className="from-base-0 pointer-events-none absolute inset-x-0 top-px z-10 h-6 bg-linear-to-b to-transparent" />
				<div className="from-base-0 pointer-events-none absolute inset-x-0 bottom-px z-10 h-6 bg-linear-to-t to-transparent" />

				{/* Center indicator */}
				<div className="pointer-events-none absolute inset-y-0 left-0 z-30 flex items-center">
					<TriangleRightIcon
						width={6}
						height={10}
						preserveAspectRatio="none"
						className="text-base-300"
					/>
				</div>
			</div>
		</div>
	);
};

interface TTimerDialProps {
	cx: TimerCx;
	sessionsBeforeLongBreak: number;
}
