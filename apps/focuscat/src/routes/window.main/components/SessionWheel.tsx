import { motion, useMotionValue } from 'motion/react';
import React from 'react';
import { cn } from '@/lib';

export const SessionWheel: React.FC<TSessionWheelProps> = (props) => {
	const { value, sessionsBeforeLongBreak = 4, itemHeight = 28, className } = props;

	const y = useMotionValue(0);
	const maxDisplay = React.useMemo(() => Math.max(Math.ceil(value) + 5, 10), [value]);
	const items = React.useMemo(() => {
		const result: number[] = [];
		for (let v = maxDisplay; v >= 0; v--) {
			result.push(v);
		}
		return result;
	}, [maxDisplay]);

	// MARK: - Effects

	React.useEffect(() => {
		const targetY = -(maxDisplay - value) * itemHeight;
		y.set(targetY);
	}, [value, maxDisplay, y, itemHeight]);

	// MARK: - UI

	return (
		<div className={cn('relative h-20 w-10 overflow-hidden select-none', className)}>
			<motion.div
				className="pointer-events-none absolute inset-x-0 top-1/2 flex flex-col items-center"
				style={{ y, marginTop: -itemHeight / 2 }}
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

interface TSessionWheelProps {
	value: number;
	sessionsBeforeLongBreak?: number;
	itemHeight?: number;
	className?: string;
}

const SessionItem: React.FC<TSessionItemProps> = (props) => {
	const { value, height, isLongBreak, showBreak } = props;

	return (
		<div className="flex shrink-0 flex-col items-center" style={{ height }}>
			{showBreak && (
				<div
					className={cn(
						'mb-0.5 rounded-full bg-neutral-300',
						isLongBreak ? 'h-1 w-3' : 'h-0.5 w-1.5'
					)}
				/>
			)}
			<span className="flex flex-1 items-center justify-center font-mono text-sm font-medium text-neutral-900 tabular-nums">
				{value}
			</span>
		</div>
	);
};

interface TSessionItemProps {
	value: number;
	height: number;
	isLongBreak: boolean;
	showBreak: boolean;
}
