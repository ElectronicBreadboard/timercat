import React from 'react';
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
			<div className="absolute inset-x-0 top-0 z-20 h-px bg-gray-200" />
			<div className="absolute inset-x-0 bottom-0 z-20 h-px bg-gray-200" />

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
				<div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-linear-to-r from-white to-transparent" />
				<div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-linear-to-l from-white to-transparent" />

				{/* Center indicator */}
				<div className="pointer-events-none absolute inset-x-0 top-px z-30 flex justify-center">
					<svg
						width="12"
						height="8"
						viewBox="0 0 12 8"
						fill="currentColor"
						className="text-gray-300"
					>
						<path d="M6 8 L12 0 L0 0 Z" />
					</svg>
				</div>
			</div>

			{/* Divider */}
			<div className="h-16 w-px bg-gray-200" />

			{/* Session wheel */}
			<div className="relative mr-2">
				<SessionWheel value={sessionProgress} sessionsBeforeLongBreak={sessionsBeforeLongBreak} />

				{/* Edge fades */}
				<div className="pointer-events-none absolute inset-x-0 top-px z-10 h-6 bg-linear-to-b from-white to-transparent" />
				<div className="pointer-events-none absolute inset-x-0 bottom-px z-10 h-6 bg-linear-to-t from-white to-transparent" />

				{/* Center indicator */}
				<div className="pointer-events-none absolute inset-y-0 left-0 z-30 flex items-center">
					<svg
						width="6"
						height="10"
						viewBox="0 0 6 10"
						fill="currentColor"
						className="text-gray-300"
					>
						<path d="M6 5 L0 0 L0 10 Z" />
					</svg>
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
