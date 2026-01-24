import React from 'react';
import { Tooltip } from '@/components';
import { cn, formatDuration, isColorDark } from '@/lib';
import type { ActivityRowCx } from '../ActivityRowCx';
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
				/>
			))}
		</div>
	);
});
WindowGroupBlock.displayName = 'WindowGroupBlock';

interface TWindowGroupBlockProps {
	block: TWindowGroupBlock;
	cx: ActivityRowCx;
	gapPx?: number;
}

// MARK: - Segment

const WindowSegment: React.FC<TWindowSegmentProps> = React.memo((props) => {
	const { segment, parentBlock, app, cx, gapPx, showDivider } = props;

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
				<div className="absolute inset-y-0 right-0 border-r border-dashed border-white/30" />
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
	cx: ActivityRowCx;
	gapPx: number;
	showDivider: boolean;
}

// MARK: - Tooltip Content

const SegmentTooltipContent: React.FC<TSegmentTooltipContentProps> = (props) => {
	const { segment, app, durationSec } = props;
	const { windows } = segment;
	const firstWindow = windows[0];

	const subtitle = React.useMemo(() => {
		if (windows.length === 1 && firstWindow?.windowTitle != null) {
			return firstWindow.windowTitle;
		}
		if (windows.length > 1) {
			return `${windows.length} windows`;
		}
		return null;
	}, [windows, firstWindow]);

	return (
		<div className="flex items-center gap-2.5">
			{app.icon != null && <img src={app.icon} alt="" className="size-8 shrink-0 rounded" />}
			<div className="flex min-w-0 flex-col gap-0.5">
				<span className="truncate text-sm font-medium">{app.name}</span>
				{subtitle != null && <span className="text-base-400 truncate text-xs">{subtitle}</span>}
				<span className="text-base-500 text-xs">{formatDuration(durationSec)}</span>
			</div>
		</div>
	);
};

interface TSegmentTooltipContentProps {
	segment: TWindowSegment;
	app: TAppInfo;
	durationSec: number;
}
