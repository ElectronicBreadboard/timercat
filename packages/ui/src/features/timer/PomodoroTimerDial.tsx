import React from 'react';
import { TriangleRightIcon } from '../../components';
import { SessionWheel } from './SessionWheel';
import { TimeDial } from './TimeDial';
import { type TTimerCx } from './TimerCx';

export const PomodoroTimerDial: React.FC<TProps> = (props) => {
	const { cx, previewMinutes, sessionsBeforeLongBreak, onPreviewChange } = props;

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
				<SessionWheel cx={cx} sessionsBeforeLongBreak={sessionsBeforeLongBreak} />

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
	cx: TTimerCx;
	previewMinutes: number | null;
	sessionsBeforeLongBreak: number;
	onPreviewChange?: (minutes: number | null) => void;
}
