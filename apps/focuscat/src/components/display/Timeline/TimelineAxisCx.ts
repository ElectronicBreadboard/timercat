import { createState } from 'feature-state';
import type { TimelineCx } from './TimelineCx';

export class TimelineAxisCx {
	public readonly timelineCx: TimelineCx;
	public readonly $markers = createState<TMarkerData[]>([]);

	private lastResolution = 0;
	private unlisteners: (() => void)[] = [];

	private static tickMap: Record<number, number> = {
		1: 0,
		2: 1,
		5: 4,
		10: 4,
		15: 2,
		30: 5,
		60: 5,
		120: 3,
		300: 4,
		600: 4,
		900: 2,
		1800: 5,
		3600: 5,
		7200: 3,
		14400: 3
	};

	constructor(timelineCx: TimelineCx) {
		this.timelineCx = timelineCx;

		this.updateMarkers();
		this.unlisteners.push(
			timelineCx.$zoom.listen(() => this.updateMarkers()),
			timelineCx.$containerRect.listen(() => this.updateMarkers())
		);
	}

	public unmount(): void {
		for (const unlisten of this.unlisteners) {
			unlisten();
		}
		this.unlisteners = [];
	}

	private updateMarkers(): void {
		const resolution = this.timelineCx.getMarkerResolution();
		if (resolution === this.lastResolution) {
			return;
		}
		this.lastResolution = resolution;
		this.$markers.set(this.createMarkerData(resolution));
	}

	private createMarkerData(resolution: number): TMarkerData[] {
		const { timelineCx } = this;
		const resolutionMs = resolution * 1000;
		const markers: TMarkerData[] = [];

		// Minor markers
		const minorCount = this.getMinorTickCount(resolution);
		if (minorCount > 0) {
			const minorIntervalMs = resolutionMs / (minorCount + 1);
			for (
				let elapsedMs = minorIntervalMs;
				elapsedMs <= timelineCx.durationMs;
				elapsedMs += minorIntervalMs
			) {
				if (elapsedMs % resolutionMs === 0) continue;
				markers.push({ type: 'minor', ms: timelineCx.startMs + elapsedMs });
			}
		}

		// Major markers
		for (
			let elapsedMs = resolutionMs;
			elapsedMs <= timelineCx.durationMs;
			elapsedMs += resolutionMs
		) {
			const ms = timelineCx.startMs + elapsedMs;
			markers.push({ type: 'major', ms, label: this.formatElapsedTime(elapsedMs, resolution) });
		}

		return markers;
	}

	private getMinorTickCount(resolutionSec: number): number {
		return TimelineAxisCx.tickMap[resolutionSec] ?? 4;
	}

	private formatElapsedTime(elapsedMs: number, resolutionSec: number): string {
		const totalSeconds = Math.round(elapsedMs / 1000);
		const hours = Math.floor(totalSeconds / 3600);
		const minutes = Math.floor((totalSeconds % 3600) / 60);
		const seconds = totalSeconds % 60;

		if (resolutionSec >= 3600) {
			return `${hours}h`;
		}

		if (resolutionSec >= 60) {
			if (hours > 0) {
				return `${hours}:${minutes.toString().padStart(2, '0')}`;
			}
			return `${minutes}m`;
		}

		if (hours > 0) {
			return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
		}
		if (minutes > 0) {
			return `${minutes}:${seconds.toString().padStart(2, '0')}`;
		}
		return `${seconds}s`;
	}
}

export type TMarkerData = TMajorMarkerData | TMinorMarkerData;

interface TMajorMarkerData {
	type: 'major';
	ms: number;
	label: string;
}

interface TMinorMarkerData {
	type: 'minor';
	ms: number;
}
