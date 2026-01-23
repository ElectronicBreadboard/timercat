import { useFeatureState } from 'feature-react/state';
import React from 'react';
import { useBoundingRectObserver } from '@/hooks';
import { cn } from '@/lib';
import type { TimelineCx } from './TimelineCx';

export const Timeline: React.FC<TTimelineProps> = (props) => {
	const { cx, className, children } = props;
	const zoom = useFeatureState(cx.$zoom);
	const scrollLeft = useFeatureState(cx.$scrollLeft);

	// MARK: - Actions

	const handleScroll = React.useCallback(
		(e: React.UIEvent<HTMLDivElement>) => {
			if (cx.isProgrammaticScroll) {
				return;
			}
			cx.setScrollLeft(e.currentTarget.scrollLeft);
		},
		[cx]
	);

	// MARK: - Effects

	useBoundingRectObserver(
		cx.containerRef,
		cx.$containerRect.get(),
		(rect) => {
			cx.$containerRect.set(rect);
		},
		[cx]
	);

	React.useEffect(() => {
		const el = cx.containerRef.current;
		if (el == null) return;

		const handleWheel = (e: WheelEvent) => {
			// Ctrl/Cmd + scroll = zoom
			if (e.ctrlKey || e.metaKey) {
				e.preventDefault();
				e.stopPropagation();
				const factor = e.deltaY > 0 ? 0.9 : 1.1;
				cx.zoomAtPoint(factor, e.clientX);
				return;
			}

			// Regular scroll when zoomed in
			if (zoom > 1) {
				e.preventDefault();
				cx.isProgrammaticScroll = true;
				const newScrollLeft = el.scrollLeft + e.deltaY;
				el.scrollLeft = newScrollLeft;
				cx.setScrollLeft(newScrollLeft);
			}
		};

		el.addEventListener('wheel', handleWheel, { passive: false });
		return () => el.removeEventListener('wheel', handleWheel);
	}, [cx, zoom]);

	React.useEffect(() => {
		const el = cx.containerRef.current;
		if (el == null) return;

		// Sync scroll when changed externally (e.g. from zoomAtPoint)
		if (Math.abs(el.scrollLeft - scrollLeft) > 1) {
			cx.isProgrammaticScroll = true;
			el.scrollLeft = scrollLeft;
		}

		requestAnimationFrame(() => {
			cx.isProgrammaticScroll = false;
		});
	}, [cx, scrollLeft]);

	// MARK: - UI

	return (
		<div
			ref={cx.containerRef}
			className={cn(
				'border-base-200 rounded-lg border',
				zoom > 1 ? 'cursor-grab overflow-x-auto active:cursor-grabbing' : 'overflow-hidden',
				className
			)}
			onScroll={handleScroll}
		>
			<div style={{ width: `${zoom * 100}%`, minWidth: '100%' }}>{children}</div>
		</div>
	);
};

export interface TTimelineProps {
	cx: TimelineCx;
	className?: string;
	children: React.ReactNode;
}
