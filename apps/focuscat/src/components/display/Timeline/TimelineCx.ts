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

	public readonly $visibleRange = createState<TVisibleRange>({ startMs: 0, endMs: 0 });
	private _lastVisibleRange: TVisibleRange = { startMs: 0, endMs: 0 };

	// Flag to prevent scroll event feedback loop during programmatic scrolls
	public isProgrammaticScroll = false;

	private _unlisteners: (() => void)[] = [];

	constructor(startMs: number, endMs: number, options: TTimelineOptions = {}) {
		const {
			markerResolutions = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600, 7200, 14400],
			minMarkerSpacingPx = 50,
			minZoom = 1,
			maxZoom = 512,
			visibleRangeBufferMs = 60_000
		} = options;
		this.startMs = startMs;
		this.endMs = endMs;
		this.durationMs = endMs - startMs;
		this.config = {
			markerResolutions,
			minMarkerSpacingPx,
			minZoom,
			maxZoom,
			visibleRangeBufferMs
		};

		const initialRange = { startMs, endMs };
		this._lastVisibleRange = initialRange;
		this.$visibleRange.set(initialRange);
		this._unlisteners.push(
			this.$scrollLeft.listen(() => this.updateVisibleRange()),
			this.$zoom.listen(() => this.updateVisibleRange())
		);
	}

	public unmount(): void {
		for (const unlisten of this._unlisteners) {
			unlisten();
		}
		this._unlisteners = [];
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

		// Calculate new scroll position to keep same time under mouse
		const newTotalWidth = this.containerWidth * newZoom;
		const newPxPerMs = newTotalWidth / this.durationMs;
		const newPxAtMouse = (msAtMouse - this.startMs) * newPxPerMs;
		const newScrollLeft = Math.max(0, newPxAtMouse - mouseX);

		// Set flag before any state changes to prevent feedback loop
		this.isProgrammaticScroll = true;

		// Update state
		this.$zoom.set(newZoom);
		this.$scrollLeft.set(newScrollLeft);

		// Sync DOM immediately for smoother feel
		const el = this.containerRef.current;
		if (el != null) {
			el.scrollLeft = newScrollLeft;
		}
	}

	public setScrollLeft(scrollLeft: number): void {
		const clamped = Math.max(0, scrollLeft);
		if (this.$scrollLeft.get() !== clamped) {
			this.$scrollLeft.set(clamped);
		}
	}

	public zoomToRange(rangeStartMs: number, rangeEndMs: number, targetFraction = 0.5): void {
		const rangeDurationMs = rangeEndMs - rangeStartMs;
		if (rangeDurationMs <= 0) {
			return;
		}

		// Calculate zoom needed for range to fill targetFraction of container
		const targetZoom = (targetFraction * this.durationMs) / rangeDurationMs;
		const newZoom = Math.max(this.config.minZoom, Math.min(this.config.maxZoom, targetZoom));

		// Calculate scroll position to center the range
		const newTotalWidth = this.containerWidth * newZoom;
		const newPxPerMs = newTotalWidth / this.durationMs;
		const rangeCenterMs = (rangeStartMs + rangeEndMs) / 2;
		const rangeCenterPx = (rangeCenterMs - this.startMs) * newPxPerMs;
		const newScrollLeft = Math.max(0, rangeCenterPx - this.containerWidth / 2);

		// Set flag before any state changes to prevent feedback loop
		this.isProgrammaticScroll = true;

		// Update state
		this.$zoom.set(newZoom);
		this.$scrollLeft.set(newScrollLeft);

		// Sync DOM immediately for smoother feel
		const el = this.containerRef.current;
		if (el != null) {
			el.scrollLeft = newScrollLeft;
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

	private updateVisibleRange(): void {
		const bufferMs = this.config.visibleRangeBufferMs;
		const range = this.getVisibleRangeWithBuffer(bufferMs);
		const threshold = bufferMs / 4;

		const startDiff = Math.abs(range.startMs - this._lastVisibleRange.startMs);
		const endDiff = Math.abs(range.endMs - this._lastVisibleRange.endMs);

		if (startDiff > threshold || endDiff > threshold) {
			this._lastVisibleRange = range;
			this.$visibleRange.set(range);
		}
	}
}

export interface TTimelineOptions {
	/** Available marker intervals in seconds (default: 1s to 4h) */
	markerResolutions?: number[];
	/** Minimum spacing between markers in pixels (default: 50) */
	minMarkerSpacingPx?: number;
	/** Minimum zoom level (default: 1) */
	minZoom?: number;
	/** Maximum zoom level (default: 512) */
	maxZoom?: number;
	/** Buffer in ms for visible range virtualization (default: 60s) */
	visibleRangeBufferMs?: number;
}

type TTimelineCxConfig = Required<TTimelineOptions>;

export interface TContainerRect {
	width: number;
	left: number;
}

export interface TVisibleRange {
	startMs: number;
	endMs: number;
}
