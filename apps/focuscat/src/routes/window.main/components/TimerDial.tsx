import React from 'react';
import { TriangleDownIcon, TriangleRightIcon } from '@/components';
import { SessionWheel } from './SessionWheel';
import { TimeWheel } from './TimeWheel';

export const TimerDial: React.FC<TTimerDialProps> = (props) => {
	const {
		value,
		sessionProgress,
		sessionsBeforeLongBreak,
		smooth = false,
		onDragStart,
		onDragMove,
		onDragEnd
	} = props;

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
					onDragStart={onDragStart}
					onDragMove={onDragMove}
					onDragEnd={onDragEnd}
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
	value: number;
	sessionProgress: number;
	sessionsBeforeLongBreak: number;
	smooth?: boolean;
	onDragStart?: () => void;
	onDragMove?: (minutes: number) => void;
	onDragEnd?: (minutes: number) => void;
}
