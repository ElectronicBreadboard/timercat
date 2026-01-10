import {
	animate,
	motion,
	useDragControls,
	useMotionValue,
	useMotionValueEvent
} from 'motion/react';
import React from 'react';
import { cn } from '@/lib';

export const NumberWheel: React.FC<TNumberWheelProps> = (props) => {
	const {
		value,
		onChange,
		onPreview,
		min = 1,
		max = 60,
		step = 1,
		labelInterval = 5,
		itemWidth = 14,
		disabled = false,
		smooth = false,
		className
	} = props;

	const x = useMotionValue(0);
	const dragControls = useDragControls();
	const isDragging = React.useRef(false);
	const lastPreviewValue = React.useRef<number>(value);

	const itemCount = Math.floor((max - min) / step) + 1;
	const minX = -(itemCount - 1) * itemWidth;
	const maxX = 0;

	const items = React.useMemo(() => {
		const result: number[] = [];
		for (let v = min; v <= max; v += step) {
			result.push(v);
		}
		return result;
	}, [min, max, step]);

	// MARK: - Actions

	const handleDragEnd = React.useCallback(() => {
		isDragging.current = false;
		if (disabled || onChange == null) return;

		// Note: Use lastPreviewValue instead of calculating from x to avoid inertia race condition
		const finalValue = lastPreviewValue.current;
		const targetIndex = (finalValue - min) / step;
		const targetX = -targetIndex * itemWidth;

		animate(x, targetX, { type: 'spring', stiffness: 400, damping: 30 });
		onChange(finalValue);
	}, [disabled, onChange, x, min, step, itemWidth]);

	const handlePointerDown = React.useCallback(
		(e: React.PointerEvent) => {
			if (!disabled) {
				isDragging.current = true;
				dragControls.start(e);
			}
		},
		[disabled, dragControls]
	);

	// MARK: - Effects

	useMotionValueEvent(x, 'change', (latestX) => {
		if (!isDragging.current) return;
		const clampedX = Math.max(minX, Math.min(maxX, latestX));
		const index = Math.round(-clampedX / itemWidth);
		const previewValue = min + index * step;
		lastPreviewValue.current = previewValue;
		onPreview?.(previewValue);
	});

	React.useEffect(() => {
		const index = (value - min) / step;
		const targetX = -index * itemWidth;

		if (smooth) {
			x.set(targetX);
		} else {
			const snappedIndex = Math.round(index);
			const snappedX = -snappedIndex * itemWidth;
			animate(x, snappedX, { type: 'spring', stiffness: 300, damping: 30 });
		}
	}, [value, min, step, x, smooth, itemWidth]);

	// MARK: - UI

	return (
		<div className={cn('relative w-full select-none', className)}>
			{/* Top border line */}
			<div className="absolute inset-x-0 top-0 h-px bg-gray-200" />

			{/* Dial body */}
			<div className="relative h-20 w-full overflow-hidden">
				{/* Tick strip */}
				<motion.div
					className="pointer-events-none absolute inset-y-0 flex items-end pb-3"
					style={{ x, left: '50%', marginLeft: -itemWidth / 2 }}
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

				{/* Edge fades */}
				<div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-linear-to-r from-white to-transparent" />
				<div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-linear-to-l from-white to-transparent" />

				{/* Drag overlay */}
				<div
					className={cn('absolute inset-0 z-20', !disabled && 'cursor-grab active:cursor-grabbing')}
					onPointerDown={handlePointerDown}
				/>
			</div>

			{/* Bottom border line */}
			<div className="absolute inset-x-0 bottom-0 h-px bg-gray-200" />

			{/* Center arrow indicator */}
			<div className="pointer-events-none absolute inset-x-0 top-px z-30 flex justify-center">
				<svg width="12" height="8" viewBox="0 0 12 8" fill="currentColor" className="text-gray-200">
					<path d="M6 8 L12 0 L0 0 Z" />
				</svg>
			</div>
		</div>
	);
};

// MARK: - TickMark

const TickMark: React.FC<TTickMarkProps> = (props) => {
	const { value, width, showLabel } = props;

	return (
		<div className="flex shrink-0 flex-col items-center justify-end" style={{ width }}>
			{showLabel && (
				<span className="mb-1 text-sm font-medium text-gray-900 tabular-nums">{value}</span>
			)}
			<div className={cn('bg-gray-300', showLabel ? 'h-4 w-[2px]' : 'h-2 w-px')} />
		</div>
	);
};

// MARK: - Types

interface TNumberWheelProps {
	value: number;
	onChange?: (value: number) => void;
	/** Called during drag with preview value */
	onPreview?: (value: number) => void;
	min?: number;
	max?: number;
	step?: number;
	/** Show number label every N steps */
	labelInterval?: number;
	/** Width of each tick item in pixels */
	itemWidth?: number;
	disabled?: boolean;
	/** Use smooth linear motion instead of spring snap (for countdown) */
	smooth?: boolean;
	className?: string;
}

interface TTickMarkProps {
	value: number;
	width: number;
	showLabel: boolean;
}
