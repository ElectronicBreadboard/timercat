import { useCombinedCompute } from 'feature-react/state';
import type { ActivityRowCx } from '../ActivityRowCx';

export function useBlockPosition(block: TBlockWithTimeRange, cx: ActivityRowCx): TBlockPosition {
	return useCombinedCompute(
		[cx.$zoom, cx.$containerRect, cx.$scrollLeft] as const,
		() => {
			const left = cx.msToPx(block.startMs);
			const right = cx.msToPx(block.endMs);
			const width = right - left;

			// Calculate visible portion for tooltip positioning
			const scrollLeft = cx.$scrollLeft.get();
			const containerWidth = cx.containerWidth;
			const visibleStart = scrollLeft;
			const visibleEnd = scrollLeft + containerWidth;

			// Clamp block to visible area
			const clampedLeft = Math.max(left, visibleStart);
			const clampedRight = Math.min(right, visibleEnd);
			const visibleWidth = Math.max(0, clampedRight - clampedLeft);

			return {
				leftPx: left,
				widthPx: width,
				visibleLeftPx: clampedLeft - left,
				visibleWidthPx: visibleWidth
			};
		},
		[cx, block.startMs, block.endMs],
		{ isEqual: false }
	);
}

export interface TBlockPosition {
	leftPx: number;
	widthPx: number;
	visibleLeftPx: number;
	visibleWidthPx: number;
}

interface TBlockWithTimeRange {
	startMs: number;
	endMs: number;
}
