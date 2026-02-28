import {
	animate,
	motion,
	useDragControls,
	useMotionValue,
	useMotionValueEvent
} from 'motion/react';
import React from 'react';
import { cn } from '@/lib';

export const TimeWheel: React.FC<TTimeWheelProps> = (props) => {
	const {
		value,
		min = 0,
		max = 60,
		itemWidth = 14,
		labelInterval = 5,
		smooth = false,
		onDragStart,
		onDragMove,
		onDragEnd,
		className
	} = props;

	const x = useMotionValue(0);
	const dragControls = useDragControls();
	const animationRef = React.useRef<ReturnType<typeof animate> | null>(null);
	const isDragging = React.useRef(false);
	const dragValue = React.useRef<number>(value);

	const minX = -(max - min) * itemWidth;
	const maxX = 0;

	const items = React.useMemo(() => {
		const result: number[] = [];
		for (let v = min; v <= max; v++) {
			result.push(v);
		}
		return result;
	}, [min, max]);

	// MARK: - Actions

	const stopAnimation = React.useCallback(() => {
		if (animationRef.current != null) {
			animationRef.current.stop();
			animationRef.current = null;
		}
	}, []);

	const handlePointerDown = React.useCallback(
		(e: React.PointerEvent) => {
			e.preventDefault();
			stopAnimation();
			isDragging.current = true;
			onDragStart?.();
			dragControls.start(e);
		},
		[dragControls, onDragStart, stopAnimation]
	);

	const handleDragEnd = React.useCallback(() => {
		isDragging.current = false;

		const finalValue = dragValue.current;
		const targetX = -(finalValue - min) * itemWidth;

		animationRef.current = animate(x, targetX, { type: 'spring', stiffness: 400, damping: 30 });
		onDragEnd?.(finalValue);
	}, [x, min, itemWidth, onDragEnd]);

	// MARK: - Effects

	useMotionValueEvent(x, 'change', (latestX) => {
		if (!isDragging.current) {
			return;
		}
		const clampedX = Math.max(minX, Math.min(maxX, latestX));
		const newValue = min + Math.round(-clampedX / itemWidth);
		dragValue.current = newValue;
		onDragMove?.(newValue);
	});

	// Sync wheel position with value prop
	React.useEffect(() => {
		if (isDragging.current) {
			return;
		}

		stopAnimation();

		if (smooth) {
			x.set(-(value - min) * itemWidth);
		} else {
			const snappedX = -Math.round(value - min) * itemWidth;
			animationRef.current = animate(x, snappedX, { type: 'spring', stiffness: 300, damping: 30 });
		}
	}, [value, min, x, itemWidth, smooth, stopAnimation]);

	// MARK: - UI

	return (
		<div
			className={cn(
				'relative h-20 w-full cursor-grab touch-pan-y overflow-hidden select-none active:cursor-grabbing',
				className
			)}
			onPointerDown={handlePointerDown}
		>
			<motion.div
				className="pointer-events-none absolute inset-y-0 left-1/2 flex items-end pb-3"
				style={{ x, marginLeft: -itemWidth / 2 }}
				drag="x"
				dragControls={dragControls}
				dragListener={false}
				dragConstraints={{ left: minX, right: maxX }}
				dragElastic={0.1}
				dragTransition={{
					power: 0.5,
					timeConstant: 120,
					modifyTarget: (target) => Math.round(target / itemWidth) * itemWidth
				}}
				onDragEnd={handleDragEnd}
			>
				{items.map((itemValue) => (
					<TickMark
						key={itemValue}
						value={itemValue}
						width={itemWidth}
						showLabel={itemValue % labelInterval === 0}
					/>
				))}
			</motion.div>
		</div>
	);
};

interface TTimeWheelProps {
	value: number;
	min?: number;
	max?: number;
	itemWidth?: number;
	labelInterval?: number;
	smooth?: boolean;
	onDragStart?: () => void;
	onDragMove?: (value: number) => void;
	onDragEnd?: (value: number) => void;
	className?: string;
}

const TickMark: React.FC<TTickMarkProps> = (props) => {
	const { value, width, showLabel } = props;

	return (
		<div className="flex shrink-0 flex-col items-center justify-end" style={{ width }}>
			{showLabel && (
				<span className="text-base-900 mb-1 text-sm font-medium tabular-nums">{value}</span>
			)}
			<div className={cn('bg-base-300', showLabel ? 'h-4 w-[2px]' : 'h-2 w-px')} />
		</div>
	);
};

interface TTickMarkProps {
	value: number;
	width: number;
	showLabel: boolean;
}
