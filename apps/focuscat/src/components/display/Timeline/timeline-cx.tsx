import { createState } from 'feature-state';
import React from 'react';

export class TimelineCx {
	public readonly config: TTimelineCxConfig;
	public readonly startMs: number;
	public readonly endMs: number;
	public readonly durationMs: number;

	public readonly containerRef = React.createRef<HTMLDivElement>();
	public readonly $containerRect = createState<TContainerRect>({ width: 400, left: 0 });
	public readonly $zoom = createState(1);
	public readonly $scrollLeft = createState(0);

	constructor(startMs: number, endMs: number, options: TTimelineOptions = {}) {
		const {
			// Marker resolutions in seconds: 1s to 4h
			markerResolutions = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600, 7200, 14400],
			minMarkerSpacingPx = 50,
			minZoom = 1,
			maxZoom = 512,
			blocks = {}
		} = options;
		this.startMs = startMs;
		this.endMs = endMs;
		this.durationMs = endMs - startMs;
		this.config = {
			markerResolutions,
			minMarkerSpacingPx,
			minZoom,
			maxZoom,
			blocks: {
				minBlockPx: blocks.minBlockPx ?? 8,
				// Show individual windows when axis resolution is <= 30 seconds
				windowDetailThresholdSec: blocks.windowDetailThresholdSec ?? 30
			}
		};
	}

	/**
	 * Get the current marker resolution in seconds.
	 * This determines the "granularity" of time visible to the user.
	 */
	public getMarkerResolution(): number {
		const visibleDurationSec = (this.containerWidth * this.msPerPx) / 1000;
		const maxMarkers = this.containerWidth / this.config.minMarkerSpacingPx;

		for (const res of this.config.markerResolutions) {
			if (visibleDurationSec / res <= maxMarkers) {
				return res;
			}
		}

		return this.config.markerResolutions.at(-1) as number;
	}

	/**
	 * Get block configuration for the current zoom level.
	 * Returns minimum block duration in ms and whether to show individual windows.
	 */
	public getBlockConfig(): TBlockConfig {
		const resolution = this.getMarkerResolution();
		const { minBlockPx, windowDetailThresholdSec } = this.config.blocks;

		// Show individual windows when zoomed in enough (resolution <= threshold)
		const showWindows = resolution <= windowDetailThresholdSec;

		// Calculate minimum block duration based on current pixel density
		// A block should be at least minBlockPx wide
		const minBlockMs = minBlockPx * this.msPerPx;

		return {
			minBlockMs,
			minBlockPx,
			showWindows,
			resolution
		};
	}

	public get containerWidth(): number {
		return this.$containerRect.get().width;
	}

	public get totalWidthPx(): number {
		return this.containerWidth * this.$zoom.get();
	}

	public get pxPerMs(): number {
		return this.totalWidthPx / this.durationMs;
	}

	public get msPerPx(): number {
		return this.durationMs / this.totalWidthPx;
	}

	public msToPx(ms: number): number {
		return (ms - this.startMs) * this.pxPerMs;
	}

	public setZoom(zoom: number): void {
		const clamped = Math.max(this.config.minZoom, Math.min(this.config.maxZoom, zoom));
		if (this.$zoom.get() !== clamped) {
			this.$zoom.set(clamped);
		}
	}

	public zoomAtPoint(factor: number, clientX: number): void {
		const mouseX = clientX - this.$containerRect.get().left;
		const scrollLeft = this.$scrollLeft.get();
		const currentZoom = this.$zoom.get();

		// Time position at mouse before zoom
		const msAtMouse = this.startMs + (scrollLeft + mouseX) * this.msPerPx;

		const newZoom = Math.max(
			this.config.minZoom,
			Math.min(this.config.maxZoom, currentZoom * factor)
		);
		if (newZoom === currentZoom) return;

		this.$zoom.set(newZoom);

		// Scroll to keep same time position under mouse
		const newTotalWidth = this.containerWidth * newZoom;
		const newPxPerMs = newTotalWidth / this.durationMs;
		const newPxAtMouse = (msAtMouse - this.startMs) * newPxPerMs;

		this.$scrollLeft.set(Math.max(0, newPxAtMouse - mouseX));
	}

	public setScrollLeft(scrollLeft: number): void {
		const clamped = Math.max(0, scrollLeft);
		if (this.$scrollLeft.get() !== clamped) {
			this.$scrollLeft.set(clamped);
		}
	}

	/** Get visible time range based on current scroll position */
	public getVisibleRange(): { startMs: number; endMs: number } {
		const scrollLeft = this.$scrollLeft.get();
		const containerWidth = this.containerWidth;

		const startMs = this.startMs + scrollLeft * this.msPerPx;
		const endMs = startMs + containerWidth * this.msPerPx;

		return {
			startMs: Math.max(this.startMs, startMs),
			endMs: Math.min(this.endMs, endMs)
		};
	}

	/** Get visible time range with buffer for smooth scrolling */
	public getVisibleRangeWithBuffer(bufferMs: number): { startMs: number; endMs: number } {
		const { startMs, endMs } = this.getVisibleRange();

		return {
			startMs: Math.max(this.startMs, startMs - bufferMs),
			endMs: Math.min(this.endMs, endMs + bufferMs)
		};
	}
}

export interface TTimelineOptions {
	markerResolutions?: number[];
	minMarkerSpacingPx?: number;
	minZoom?: number;
	maxZoom?: number;
	/** Activity block configuration */
	blocks?: TBlockOptions;
}

export interface TBlockOptions {
	/** Minimum block width in pixels before aggregation (default: 8) */
	minBlockPx?: number;
	/** Resolution threshold in seconds - when axis resolution <= this, show individual windows (default: 5) */
	windowDetailThresholdSec?: number;
}

const ReactTimelineCx = React.createContext<TimelineCx | null>(null);

export const TimelineCxProvider: React.FC<TTimelineCxProviderProps> = (props) => {
	const { startMs, endMs, config, children } = props;

	const cx = React.useMemo(() => {
		return new TimelineCx(startMs, endMs, config);
	}, [startMs, endMs, config]);

	return <ReactTimelineCx.Provider value={cx}>{children}</ReactTimelineCx.Provider>;
};

export function useTimelineCx(): TimelineCx {
	const cx = React.useContext(ReactTimelineCx);
	if (cx == null) {
		throw new Error('useTimelineCx must be used within a TimelineCxProvider');
	}
	return cx;
}

interface TTimelineCxProviderProps {
	startMs: number;
	endMs: number;
	config?: TTimelineOptions;
	children: React.ReactNode;
}

interface TContainerRect {
	width: number;
	left: number;
}

/** Internal config with all defaults resolved */
interface TTimelineCxConfig {
	markerResolutions: number[];
	minMarkerSpacingPx: number;
	minZoom: number;
	maxZoom: number;
	blocks: Required<TBlockOptions>;
}

/** Block configuration for current zoom level */
export interface TBlockConfig {
	/** Minimum block duration in milliseconds */
	minBlockMs: number;
	/** Minimum block width in pixels */
	minBlockPx: number;
	/** Whether to show individual windows (true when zoomed in enough) */
	showWindows: boolean;
	/** Current axis resolution in seconds */
	resolution: number;
}
