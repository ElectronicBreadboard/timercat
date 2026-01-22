import { useCombinedCompute } from 'feature-react/state';
import React from 'react';
import { cn } from '@/lib';
import { useTimelineCx } from './TimelineCx';

export const TimelineAxis: React.FC<TTimelineAxisProps> = (props) => {
	const { className } = props;
	const cx = useTimelineCx();

	const markers = useCombinedCompute(
		[cx.$zoom, cx.$containerRect] as const,
		() => createMarkers(cx),
		[cx],
		{ isEqual: false }
	);

	return (
		<div className={cn('bg-base-50 border-base-100 relative h-6 border-b', className)}>
			{markers.map((marker) => {
				switch (marker.type) {
					case 'major':
						return (
							<div
								key={marker.ms}
								className="absolute top-0 flex h-full -translate-x-1/2 flex-col items-center"
								style={{ left: marker.px }}
							>
								<div className="bg-base-300 h-2.5 w-px" />
								<span className="text-base-400 text-[10px]">{marker.label}</span>
							</div>
						);
					case 'minor':
						return (
							<div
								key={marker.ms}
								className="absolute top-0 -translate-x-1/2"
								style={{ left: marker.px }}
							>
								<div className="bg-base-200 h-1.5 w-px" />
							</div>
						);
				}
			})}
		</div>
	);
};

export interface TTimelineAxisProps {
	className?: string;
}

function createMarkers(cx: ReturnType<typeof useTimelineCx>): TMarker[] {
	const resolution = cx.getMarkerResolution();
	const resolutionMs = resolution * 1000;
	const markers: TMarker[] = [];

	// Minor markers
	const minorCount = getMinorTickCount(resolution);
	if (minorCount > 0) {
		const minorIntervalMs = resolutionMs / (minorCount + 1);

		for (
			let elapsedMs = minorIntervalMs;
			elapsedMs <= cx.durationMs;
			elapsedMs += minorIntervalMs
		) {
			if (elapsedMs % resolutionMs === 0) continue;

			const ms = cx.startMs + elapsedMs;
			markers.push({ type: 'minor', ms, px: cx.msToPx(ms) });
		}
	}

	// Major markers
	for (let elapsedMs = resolutionMs; elapsedMs <= cx.durationMs; elapsedMs += resolutionMs) {
		const ms = cx.startMs + elapsedMs;
		markers.push({
			type: 'major',
			ms,
			px: cx.msToPx(ms),
			label: formatCleanInterval(elapsedMs, resolution)
		});
	}

	return markers;
}

type TMarker = TMajorMarker | TMinorMarker;

interface TMajorMarker {
	type: 'major';
	ms: number;
	px: number;
	label: string;
}

interface TMinorMarker {
	type: 'minor';
	ms: number;
	px: number;
}

function getMinorTickCount(resolutionSec: number): number {
	if (resolutionSec === 1) return 0;
	if (resolutionSec === 2) return 1;
	if (resolutionSec === 5) return 4;
	if (resolutionSec === 10) return 4;
	if (resolutionSec === 15) return 2;
	if (resolutionSec === 30) return 5;
	if (resolutionSec === 60) return 5;
	if (resolutionSec === 120) return 3;
	if (resolutionSec === 300) return 4;
	if (resolutionSec === 600) return 4;
	if (resolutionSec === 900) return 2;
	if (resolutionSec === 1800) return 5;
	if (resolutionSec === 3600) return 5;
	if (resolutionSec === 7200) return 3;
	if (resolutionSec === 14400) return 3;
	return 4;
}

function formatCleanInterval(elapsedMs: number, resolutionSec: number): string {
	const totalSeconds = Math.round(elapsedMs / 1000);
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;

	// Hour-level resolution
	if (resolutionSec >= 3600) {
		return `${hours}h`;
	}

	// Minute-level resolution
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
