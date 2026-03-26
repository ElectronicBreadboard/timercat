import { cn, isColorDark, Tooltip } from '@repo/ui';
import React from 'react';
import type { ActivityTrackCx } from '../ActivityTrackCx';
import { useBlockStyle, useVisibleRangeStyle } from '../hooks';
import type { TAppInfo, TWindowGroupBlock, TWindowSegment } from '../types';
import { WindowSegmentTooltip } from './WindowSegmentTooltip';

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
				content={<WindowSegmentTooltip segment={segment} app={app} durationSec={durationSec} />}
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
