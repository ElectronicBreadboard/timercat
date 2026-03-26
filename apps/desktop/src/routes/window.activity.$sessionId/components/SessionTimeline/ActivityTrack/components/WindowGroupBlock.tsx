import { cn, formatDuration, isColorDark, Tooltip } from '@repo/ui';
import React from 'react';
import type { specta } from '@/environment';
import type { ActivityTrackCx } from '../ActivityTrackCx';
import { useBlockStyle, useVisibleRangeStyle } from '../hooks';
import type { TAppInfo, TWindowGroupBlock, TWindowSegment } from '../types';

export const WindowGroupBlock: React.FC<TWindowGroupBlockProps> = React.memo((props) => {
	const { block, cx, gapPx = 1 } = props;
	const { app, segments } = block;

	const blockRef = React.useRef<HTMLDivElement>(null);
	const color = app.color ?? '#9ca3af';
	const isDark = isColorDark(color);

	// MARK: - Effects

	useBlockStyle(blockRef, block, cx, { gapPx });

	// MARK: - UI

	return (
		<div
			ref={blockRef}
			className={cn(
				'absolute top-1 bottom-1 overflow-hidden rounded',
				isDark && 'border border-white/30'
			)}
			style={{ backgroundColor: color }}
		>
			{segments.map((segment, index) => (
				<WindowSegment
					key={`${segment.startMs}-${index}`}
					segment={segment}
					parentBlock={block}
					app={app}
					cx={cx}
					gapPx={gapPx}
					showDivider={index < segments.length - 1}
					isDark={isDark}
				/>
			))}
		</div>
	);
});
WindowGroupBlock.displayName = 'WindowGroupBlock';

interface TWindowGroupBlockProps {
	block: TWindowGroupBlock;
	cx: ActivityTrackCx;
	gapPx?: number;
}

// MARK: - Segment

const WindowSegment: React.FC<TWindowSegmentProps> = React.memo((props) => {
	const { segment, parentBlock, app, cx, gapPx, showDivider, isDark } = props;

	const segmentRef = React.useRef<HTMLDivElement>(null);
	const triggerRef = React.useRef<HTMLDivElement>(null);
	const color = app.color ?? '#9ca3af';
	const durationSec = (segment.endMs - segment.startMs) / 1000;

	// MARK: - Actions

	const handleClick = React.useCallback(() => {
		cx.timelineCx.zoomToRange(segment.startMs, segment.endMs, 0.7);
	}, [cx, segment.startMs, segment.endMs]);

	// MARK: - Effects

	useBlockStyle(segmentRef, segment, cx, { gapPx, parentBlock });
	useVisibleRangeStyle(triggerRef, segment, cx);

	// MARK: - UI

	return (
		<div
			ref={segmentRef}
			className="absolute inset-y-0 transition-opacity hover:opacity-80"
			style={{ backgroundColor: color }}
		>
			{showDivider && (
				<div
					className={cn(
						'absolute inset-y-0 right-0 border-r border-dashed',
						isDark ? 'border-white/50' : 'border-black/50'
					)}
				/>
			)}

			{/* Tooltip trigger */}
			<Tooltip
				content={<SegmentTooltipContent segment={segment} app={app} durationSec={durationSec} />}
				side="top"
				positionerClassName="z-50"
			>
				<div ref={triggerRef} className="absolute inset-y-0 cursor-pointer" onClick={handleClick} />
			</Tooltip>
		</div>
	);
});
WindowSegment.displayName = 'WindowSegment';

interface TWindowSegmentProps {
	segment: TWindowSegment;
	parentBlock: TWindowGroupBlock;
	app: TAppInfo;
	cx: ActivityTrackCx;
	gapPx: number;
	showDivider: boolean;
	isDark: boolean;
}

// MARK: - Tooltip Content

const SegmentTooltipContent: React.FC<TSegmentTooltipContentProps> = (props) => {
	const { segment, app, durationSec } = props;
	const { windows } = segment;
	const firstWindow = windows[0];
	const windowEntries = React.useMemo(() => getWindowEntriesSortedByDuration(windows), [windows]);
	const visibleWindowEntries = windowEntries.slice(0, 3);
	const hiddenWindowCount = Math.max(windowEntries.length - visibleWindowEntries.length, 0);

	const subtitle = React.useMemo(() => {
		if (windows.length === 1 && firstWindow?.windowTitle != null) {
			return truncateWindowText(firstWindow.windowTitle);
		}
		if (windows.length > 1) {
			return `${windows.length} windows`;
		}
		return null;
	}, [windows, firstWindow]);

	return (
		<div className="flex flex-col gap-2">
			<div className="flex items-center gap-2.5">
				{app.icon != null && <img src={app.icon} alt="" className="size-8 shrink-0 rounded" />}
				<div className="flex min-w-0 flex-col gap-0.5">
					<span className="truncate text-sm font-medium">{app.name}</span>
					{subtitle != null && <span className="text-base-400 truncate text-xs">{subtitle}</span>}
					<span className="text-base-500 text-xs">{formatDuration(durationSec)}</span>
				</div>
			</div>

			{windows.length > 1 && visibleWindowEntries.length > 0 && (
				<div className="border-base-200 flex flex-col gap-1 border-t pt-1.5">
					{visibleWindowEntries.map((entry) => (
						<div key={entry.id} className="flex items-center gap-1.5">
							<div className="bg-base-300 size-2 shrink-0 rounded-full" />
							<span className="text-base-400 min-w-0 flex-1 truncate text-xs">{entry.label}</span>
							<span className="text-base-500 shrink-0 text-xs">
								{formatDuration(entry.durationMs / 1000)}
							</span>
						</div>
					))}
					{hiddenWindowCount > 0 && (
						<span className="text-base-500 pt-0.5 text-xs">+{hiddenWindowCount} more windows</span>
					)}
				</div>
			)}
		</div>
	);
};

interface TSegmentTooltipContentProps {
	segment: TWindowSegment;
	app: TAppInfo;
	durationSec: number;
}

function getWindowEntriesSortedByDuration(windows: specta.WindowActivityDto[]): TWindowEntry[] {
	const map = new Map<string, TWindowEntry>();

	for (const window of windows) {
		const rawLabel = getWindowLabel(window);
		const durationMs = window.endedAt - window.startedAt;
		const existing = map.get(rawLabel);

		if (existing != null) {
			existing.durationMs += durationMs;
			continue;
		}

		map.set(rawLabel, {
			id: rawLabel,
			label: truncateWindowText(rawLabel),
			durationMs
		});
	}

	return Array.from(map.values()).sort((a, b) => b.durationMs - a.durationMs);
}

interface TWindowEntry {
	id: string;
	label: string;
	durationMs: number;
}

function getWindowLabel(window: specta.WindowActivityDto): string {
	const title = window.windowTitle?.trim();
	if (title != null && title.length > 0) {
		return title;
	}

	const websiteName = window.websiteName?.trim();
	if (websiteName != null && websiteName.length > 0) {
		return websiteName;
	}

	const websiteDomain = window.websiteDomain?.trim();
	if (websiteDomain != null && websiteDomain.length > 0) {
		return websiteDomain;
	}

	const browserUrl = window.browserUrl?.trim();
	if (browserUrl != null && browserUrl.length > 0) {
		return browserUrl;
	}

	return 'Untitled window';
}

function truncateWindowText(value: string, maxLength: number = 24): string {
	if (value.length <= maxLength) {
		return value;
	}

	return `${value.slice(0, maxLength - 1).trimEnd()}…`;
}
