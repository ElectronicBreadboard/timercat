import { useCombinedCompute } from 'feature-react/state';
import React from 'react';
import { cn } from '@/lib';
import { useTimelineCx } from './timeline-cx';

export const TimelineAxis: React.FC<TTimelineAxisProps> = (props) => {
	const { className } = props;
	const cx = useTimelineCx();

	const markers = useCombinedCompute(
		[cx.$zoom, cx.$containerRect] as const,
		() => {
			const resolution = cx.getMarkerResolution();
			const resolutionMs = resolution * 1000;

			// Start from first interval (skip 0m at the edge)
			const result: TMarker[] = [];
			for (let elapsedMs = resolutionMs; elapsedMs <= cx.durationMs; elapsedMs += resolutionMs) {
				const ms = cx.startMs + elapsedMs;
				result.push({
					ms,
					px: cx.msToPx(ms),
					label: formatCleanInterval(elapsedMs, resolution)
				});
			}

			return result;
		},
		[cx],
		{ isEqual: false }
	);

	return (
		<div className={cn('bg-base-50 border-base-100 relative h-6 border-b', className)}>
			{markers.map((marker) => (
				<div
					key={marker.ms}
					className="absolute top-0 flex h-full -translate-x-1/2 flex-col items-center"
					style={{ left: marker.px }}
				>
					<div className="bg-base-300 h-2 w-px" />
					<span className="text-base-400 text-[10px]">{marker.label}</span>
				</div>
			))}
		</div>
	);
};

function formatCleanInterval(elapsedMs: number, resolutionSec: number): string {
	const totalSeconds = Math.round(elapsedMs / 1000);
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;

	// Hour-level resolution (3600s = 1h)
	if (resolutionSec >= 3600) {
		return `${hours}h`;
	}

	// Minute-level resolution (60s+)
	if (resolutionSec >= 60) {
		if (hours > 0) {
			return `${hours}:${minutes.toString().padStart(2, '0')}`;
		}
		return `${minutes}m`;
	}

	// Second-level resolution
	if (hours > 0) {
		return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
	}
	if (minutes > 0) {
		return `${minutes}:${seconds.toString().padStart(2, '0')}`;
	}
	return `${seconds}s`;
}

export interface TTimelineAxisProps {
	className?: string;
}

interface TMarker {
	ms: number;
	px: number;
	label: string;
}
