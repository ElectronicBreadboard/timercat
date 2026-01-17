import { animate, motion, useMotionValue } from 'motion/react';
import React from 'react';
import { cn } from '@/lib';

export const SessionWheel: React.FC<TSessionWheelProps> = (props) => {
	const { value, windowSize = 10, sessionsBeforeLongBreak = 4, itemHeight = 28, className } = props;

	const y = useMotionValue(0);
	const items = React.useMemo(() => {
		const center = Math.floor(value);
		const start = Math.max(0, center - windowSize);
		const end = center + windowSize;
		const result: number[] = [];
		for (let i = start; i <= end; i++) {
			result.push(i);
		}
		return result;
	}, [value, windowSize]);

	// MARK: - Effects

	React.useEffect(() => {
		const targetY = value * itemHeight;
		animate(y, targetY, { type: 'spring', stiffness: 300, damping: 30 });
	}, [value, y, itemHeight]);

	// MARK: - UI

	return (
		<div className={cn('relative h-20 w-10 overflow-hidden select-none', className)}>
			<motion.div
				className="pointer-events-none absolute inset-x-0 top-1/2"
				style={{ y, marginTop: -itemHeight / 2 }}
			>
				{items.map((index) => (
					<SessionItem
						key={index}
						index={index}
						top={-index * itemHeight}
						height={itemHeight}
						showLongBreak={index > 0 && index % sessionsBeforeLongBreak === 0}
					/>
				))}
			</motion.div>
		</div>
	);
};

interface TSessionWheelProps {
	value: number;
	windowSize?: number;
	sessionsBeforeLongBreak?: number;
	itemHeight?: number;
	className?: string;
}

const SessionItem: React.FC<TSessionItemProps> = (props) => {
	const { index, top, height, showLongBreak } = props;

	return (
		<div className="absolute inset-x-0 flex flex-col items-center" style={{ top, height }}>
			<span className="flex flex-1 items-center justify-center font-mono text-sm font-medium text-gray-900 tabular-nums">
				{index + 1}
			</span>
			{index > 0 && (
				<div
					className={cn(
						'mt-0.5 rounded-full bg-gray-300',
						showLongBreak ? 'h-1 w-3' : 'h-0.5 w-1.5'
					)}
				/>
			)}
		</div>
	);
};

interface TSessionItemProps {
	index: number;
	top: number;
	height: number;
	showLongBreak: boolean;
}
