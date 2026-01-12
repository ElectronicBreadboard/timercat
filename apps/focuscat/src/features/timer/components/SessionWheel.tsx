import { motion, useMotionValue } from 'motion/react';
import React from 'react';
import { cn } from '@/lib';

/**
 * Passive display showing sessions completed with break indicators.
 * Counts up (0, 1, 2, 3...) - not interactive.
 */
export const SessionWheel: React.FC<TSessionWheelProps> = (props) => {
	const { value, sessionsBeforeLongBreak = 4, itemHeight = 28, className } = props;

	const y = useMotionValue(0);

	// Show numbers 0 to some reasonable max (value + buffer for scrolling visual)
	const maxDisplay = Math.max(value + 5, 10);
	const items = React.useMemo(() => {
		const result: number[] = [];
		for (let v = maxDisplay; v >= 0; v--) {
			result.push(v);
		}
		return result;
	}, [maxDisplay]);

	// Update position smoothly (value is fractional: 0, 0.1, 0.2, ..., 0.5, 0.6, ..., 1.0, ...)
	React.useEffect(() => {
		const targetY = -(maxDisplay - value) * itemHeight;
		y.set(targetY);
	}, [value, maxDisplay, y, itemHeight]);

	return (
		<div className={cn('relative h-20 w-10 select-none overflow-hidden', className)}>
			{/* Number strip */}
			<motion.div
				className="pointer-events-none absolute inset-x-0 flex flex-col items-center"
				style={{ y, top: '50%', marginTop: -itemHeight / 2 }}
			>
				{items.map((itemValue, index) => (
					<SessionItem
						key={itemValue}
						value={itemValue}
						height={itemHeight}
						isLongBreak={itemValue > 0 && itemValue % sessionsBeforeLongBreak === 0}
						showBreak={index > 0}
					/>
				))}
			</motion.div>
		</div>
	);
};

// MARK: - SessionItem

const SessionItem: React.FC<TSessionItemProps> = (props) => {
	const { value, height, isLongBreak, showBreak } = props;

	return (
		<div className="flex shrink-0 flex-col items-center" style={{ height }}>
			{/* Break indicator (above number) */}
			{showBreak && (
				<div
					className={cn('mb-0.5 rounded-full bg-gray-300', isLongBreak ? 'h-1 w-3' : 'h-0.5 w-1.5')}
				/>
			)}

			{/* Number */}
			<span className="flex flex-1 items-center justify-center font-mono text-sm font-medium text-gray-900 tabular-nums">
				{value}
			</span>
		</div>
	);
};

interface TSessionWheelProps {
	/** Sessions completed (counts up: 0, 1, 2, 3...) */
	value: number;
	/** Long break every N sessions (default: 4) */
	sessionsBeforeLongBreak?: number;
	itemHeight?: number;
	className?: string;
}

interface TSessionItemProps {
	value: number;
	height: number;
	isLongBreak: boolean;
	showBreak: boolean;
}
