import { useCombinedCompute } from 'feature-react/state';
import React from 'react';
import { TriangleDownIcon } from '@/components';
import { type TimerCx } from '@/features/timer';
import { TimeWheel } from './TimeWheel';

export const TimeDial: React.FC<TTimeDialProps> = (props) => {
	const { cx, previewMinutes, onPreviewChange } = props;

	const wasRunningRef = React.useRef(false);

	const { value, smooth } = useCombinedCompute(
		[cx.$status, cx.$remainingSeconds] as const,
		([{ value: status = 'idle' }, { value: remainingSeconds = 0 }]) => {
			const isActive = status !== 'idle';
			const isPreviewing = previewMinutes != null;

			// Display minutes: fractional when active (smooth animation), whole when idle
			const displayMinutes = isActive ? remainingSeconds / 60 : Math.ceil(remainingSeconds / 60);

			return {
				value: isPreviewing ? previewMinutes : displayMinutes,
				smooth: isActive && !isPreviewing
			};
		},
		[previewMinutes],
		{ isEqual: (a, b) => a.value === b.value && a.smooth === b.smooth }
	);

	// MARK: - Actions

	const handleDragStart = React.useCallback(() => {
		wasRunningRef.current = cx.$status.get() === 'running';
		if (wasRunningRef.current) {
			cx.pause();
		}
	}, [cx]);

	const handleDragMove = React.useCallback(
		(minutes: number) => {
			onPreviewChange?.(minutes);
		},
		[onPreviewChange]
	);

	const handleDragEnd = React.useCallback(
		async (minutes: number) => {
			onPreviewChange?.(null);
			await cx.setDuration(minutes);
			if (wasRunningRef.current) {
				cx.resume();
			}
		},
		[cx, onPreviewChange]
	);

	// MARK: - UI

	return (
		<div className="relative ml-2 flex-1">
			<TimeWheel
				value={value}
				smooth={smooth}
				onDragStart={handleDragStart}
				onDragMove={handleDragMove}
				onDragEnd={handleDragEnd}
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
	);
};

interface TTimeDialProps {
	cx: TimerCx;
	previewMinutes: number | null;
	onPreviewChange?: (minutes: number | null) => void;
}
