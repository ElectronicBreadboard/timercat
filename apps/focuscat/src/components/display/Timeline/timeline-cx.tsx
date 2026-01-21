import { createState } from 'feature-state';
import React from 'react';

export class TimelineCx {
	public readonly config: Required<TTimelineOptions>;
	public readonly startMs: number;
	public readonly endMs: number;
	public readonly durationMs: number;

	public readonly containerRef = React.createRef<HTMLDivElement>();
	public readonly $containerRect = createState<TContainerRect>({ width: 400, left: 0 });
	public readonly $zoom = createState(1);
	public readonly $scrollLeft = createState(0);

	constructor(startMs: number, endMs: number, options: TTimelineOptions = {}) {
		const {
			markerResolutions = [5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600],
			minMarkerSpacingPx = 60,
			minZoom = 1,
			maxZoom = 32
		} = options;
		this.startMs = startMs;
		this.endMs = endMs;
		this.durationMs = endMs - startMs;
		this.config = {
			markerResolutions,
			minMarkerSpacingPx,
			minZoom,
			maxZoom
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
}

export interface TTimelineOptions {
	markerResolutions?: number[];
	minMarkerSpacingPx?: number;
	minZoom?: number;
	maxZoom?: number;
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
