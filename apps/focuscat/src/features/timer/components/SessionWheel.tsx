import {
	animate,
	motion,
	useDragControls,
	useMotionValue,
	useMotionValueEvent
} from 'motion/react';
import React from 'react';
import { cn } from '@/lib';

export const SessionWheel: React.FC<TSessionWheelProps> = (props) => {
	const {
		value,
		onChange,
		onPreview,
		onDragStart,
		min = 0,
		max = 16,
		itemHeight = 28,
		targetSessions,
		sessionsBeforeLongBreak = 4,
		smooth = false,
		className
	} = props;

	const y = useMotionValue(0);
	const dragControls = useDragControls();
	const isDragging = React.useRef(false);
	const isAnimatingFromDrag = React.useRef(false);
	const lastPreviewValue = React.useRef<number>(value);

	const itemCount = max - min + 1;
	const minY = -(itemCount - 1) * itemHeight;
	const maxY = 0;

	const items = React.useMemo(() => {
		const result: number[] = [];
		for (let v = max; v >= min; v--) {
			result.push(v);
		}
		return result;
	}, [min, max]);

	// MARK: - Actions

	const handleDragEnd = React.useCallback(() => {
		isDragging.current = false;
		if (onChange == null) return;

		const finalValue = lastPreviewValue.current;
		const targetIndex = max - finalValue;
		const targetY = -targetIndex * itemHeight;

		isAnimatingFromDrag.current = true;
		animate(y, targetY, { type: 'spring', stiffness: 400, damping: 30 }).then(() => {
			isAnimatingFromDrag.current = false;
		});
		onChange(finalValue);
	}, [onChange, y, max, itemHeight]);

	const handlePointerDown = React.useCallback(
		(e: React.PointerEvent) => {
			e.preventDefault();
			isDragging.current = true;
			onDragStart?.();
			dragControls.start(e);
		},
		[dragControls, onDragStart]
	);

	// MARK: - Effects

	useMotionValueEvent(y, 'change', (latestY) => {
		if (!isDragging.current) return;
		const clampedY = Math.max(minY, Math.min(maxY, latestY));
		const index = Math.round(-clampedY / itemHeight);
		const previewValue = max - index;
		lastPreviewValue.current = previewValue;
		onPreview?.(previewValue);
	});

	React.useEffect(() => {
		// Skip if we're already animating from drag end
		if (isAnimatingFromDrag.current) return;

		const index = max - value;
		const targetY = -index * itemHeight;

		if (smooth) {
			y.set(targetY);
		} else {
			animate(y, targetY, { type: 'spring', stiffness: 300, damping: 30 });
		}
	}, [value, max, y, itemHeight, smooth]);

	// MARK: - UI

	return (
		<div className={cn('relative h-20 w-10 select-none overflow-hidden', className)}>
			{/* Number strip */}
			<motion.div
				className="pointer-events-none absolute inset-x-0 flex flex-col items-center"
				style={{ y, top: '50%', marginTop: -itemHeight / 2 }}
				drag="y"
				dragControls={dragControls}
				dragListener={false}
				dragConstraints={{ top: minY, bottom: maxY }}
				dragElastic={0.1}
				dragTransition={{
					power: 0.5,
					timeConstant: 120,
					modifyTarget: (target) => Math.round(target / itemHeight) * itemHeight
				}}
				onDragEnd={handleDragEnd}
			>
				{items.map((itemValue, index) => {
					// Long break after every sessionsBeforeLongBreak completed sessions
					const completedAtPosition = targetSessions != null ? targetSessions - itemValue : 0;
					const isLongBreak =
						completedAtPosition > 0 && completedAtPosition % sessionsBeforeLongBreak === 0;

					return (
						<SessionItem
							key={itemValue}
							value={itemValue}
							height={itemHeight}
							isLongBreak={isLongBreak}
							showBreak={index > 0}
						/>
					);
				})}
			</motion.div>

			{/* Drag overlay */}
			<div
				className="absolute inset-0 z-20 cursor-grab active:cursor-grabbing"
				onPointerDown={handlePointerDown}
			/>
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
	value: number;
	onChange?: (value: number) => void;
	onPreview?: (value: number) => void;
	/** Called when user starts dragging */
	onDragStart?: () => void;
	min?: number;
	max?: number;
	itemHeight?: number;
	/** Current target sessions (for break indicator calculation) */
	targetSessions?: number;
	/** Sessions before long break (for break indicators) */
	sessionsBeforeLongBreak?: number;
	smooth?: boolean;
	className?: string;
}

interface TSessionItemProps {
	value: number;
	height: number;
	isLongBreak: boolean;
	showBreak: boolean;
}
