import { useCombinedCompute } from 'feature-react/state';
import React from 'react';
import { TriangleRightIcon } from '@/components';
import { type TimerCx } from '@/features/timer';
import { SessionWheel } from './SessionWheel';
import { TimeDial } from './TimeDial';

export const PomodoroTimerDial: React.FC<TProps> = (props) => {
	const { cx, previewMinutes, sessionsBeforeLongBreak, onPreviewChange } = props;

	const sessionProgress = useCombinedCompute(
		[
			cx.$status,
			cx.$sessionType,
			cx.$remainingSeconds,
			cx.$totalSeconds,
			cx.$sessionsCompleted
		] as const,
		([
			{ value: status = 'idle' },
			{ value: sessionType = 'pomodoro:work' },
			{ value: remainingSeconds = 0 },
			{ value: totalSeconds = 0 },
			{ value: sessionsCompleted = 0 }
		]) => {
			if (status === 'idle') {
				return 0;
			}

			// Session progress: each session spans 0→1, split into work (0→0.5) and break (0.5→1.0)
			const phaseProgress = totalSeconds > 0 ? (totalSeconds - remainingSeconds) / totalSeconds : 0;
			return sessionType.endsWith(':work')
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

			<TimeDial cx={cx} previewMinutes={previewMinutes} onPreviewChange={onPreviewChange} />

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

interface TProps {
	cx: TimerCx;
	previewMinutes: number | null;
	sessionsBeforeLongBreak: number;
	onPreviewChange?: (minutes: number | null) => void;
}
