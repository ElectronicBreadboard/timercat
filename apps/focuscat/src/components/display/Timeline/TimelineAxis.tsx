import { useCombinedCompute, useSubscriber } from 'feature-react/state';
import React from 'react';
import { useMemoCleanup } from '@/hooks';
import { cn } from '@/lib';
import { TimelineAxisCx, type TMarkerData } from './TimelineAxisCx';
import type { TimelineCx } from './TimelineCx';

export const TimelineAxis: React.FC<TTimelineAxisProps> = (props) => {
	const { cx: timelineCx, className } = props;
	const cx = useMemoCleanup(() => {
		const instance = new TimelineAxisCx(timelineCx);
		return [instance, () => instance.unmount()];
	}, [timelineCx]);

	const markerRefs = React.useRef<Map<number, HTMLDivElement>>(new Map());
	const markers = useCombinedCompute(
		[cx.$markers, timelineCx.$visibleRange] as const,
		([{ value: allMarkers = [] }, { value: range = { startMs: 0, endMs: Infinity } }]) =>
			allMarkers.filter((m) => m.ms >= range.startMs && m.ms <= range.endMs),
		[cx, timelineCx],
		{ isEqual: markersEqual }
	);

	// MARK: - Actions

	const updatePositions = React.useCallback(() => {
		for (const [ms, el] of markerRefs.current) {
			el.style.left = `${timelineCx.msToPx(ms)}px`;
		}
	}, [timelineCx]);

	const setMarkerRef = React.useCallback((ms: number, el: HTMLDivElement | null) => {
		if (el != null) {
			markerRefs.current.set(ms, el);
		} else {
			markerRefs.current.delete(ms);
		}
	}, []);

	// MARK: - Effects

	// Note: useLayoutEffect needed because when markers change (resolution change),
	// new DOM elements are created and need positions set after React renders them.
	React.useLayoutEffect(() => {
		updatePositions();
	}, [updatePositions, markers]);

	useSubscriber(timelineCx.$zoom, updatePositions, [updatePositions]);
	useSubscriber(timelineCx.$containerRect, updatePositions, [updatePositions]);

	// MARK: - UI

	return (
		<div className={cn('bg-base-50 border-base-100 relative h-6 border-b', className)}>
			{markers.map((marker) => {
				switch (marker.type) {
					case 'major':
						return (
							<div
								key={marker.ms}
								ref={(el) => setMarkerRef(marker.ms, el)}
								className="absolute top-0 flex h-full -translate-x-1/2 flex-col items-center"
							>
								<div className="bg-base-300 h-2.5 w-px" />
								<span className="text-base-400 text-[10px]">{marker.label}</span>
							</div>
						);
					case 'minor':
						return (
							<div
								key={marker.ms}
								ref={(el) => setMarkerRef(marker.ms, el)}
								className="absolute top-0 -translate-x-1/2"
							>
								<div className="bg-base-200 h-1.5 w-px" />
							</div>
						);
				}
			})}
		</div>
	);
};

interface TTimelineAxisProps {
	cx: TimelineCx;
	className?: string;
}

function markersEqual(a: TMarkerData[], b: TMarkerData[]): boolean {
	if (a.length !== b.length) return false;
	for (let i = 0; i < a.length; i++) {
		if (a[i]?.ms !== b[i]?.ms) return false;
	}
	return true;
}
