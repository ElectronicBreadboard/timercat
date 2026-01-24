import { useSubscriber } from 'feature-react/state';
import React from 'react';
import type { ActivityRowCx } from '../ActivityRowCx';

/**
 * Updates tooltip trigger to cover only the visible portion of a block.
 * Ensures tooltip anchors correctly during scroll.
 */
export function useVisibleRangeStyle(
	ref: React.RefObject<HTMLDivElement | null>,
	block: TTimeRange,
	cx: ActivityRowCx,
	options: TVisibleRangeStyleOptions = {}
): void {
	const { offsetPx = 0 } = options;

	const update = React.useCallback(() => {
		const el = ref.current;
		if (el == null) {
			return;
		}

		const left = cx.msToPx(block.startMs);
		const right = cx.msToPx(block.endMs);
		const scrollLeft = cx.$scrollLeft.get();
		const visibleEnd = scrollLeft + cx.containerWidth;

		const clampedLeft = Math.max(left, scrollLeft);
		const clampedRight = Math.min(right, visibleEnd);
		const visibleWidth = Math.max(0, clampedRight - clampedLeft);

		el.style.left = `${Math.max(clampedLeft - left - offsetPx, 0)}px`;
		el.style.width = `${Math.max(visibleWidth, 2)}px`;
	}, [ref, cx, block.startMs, block.endMs, offsetPx]);

	useSubscriber(cx.$zoom, update, [update]);
	useSubscriber(cx.$scrollLeft, update, [update]);
	useSubscriber(cx.$containerRect, update, [update]);
}

interface TVisibleRangeStyleOptions {
	offsetPx?: number;
}

interface TTimeRange {
	startMs: number;
	endMs: number;
}
