import { useCombinedCompute } from 'feature-react/state';
import React from 'react';
import { Tooltip } from '@/components';
import { cn, formatDuration, isColorDark } from '@/lib';
import type { ActivityRowCx } from '../ActivityRowCx';
import { useBlockPosition } from '../hooks';
import type { TAppInfo, TWindowGroupBlock, TWindowSegment } from '../types';

export const WindowGroupBlock: React.FC<TWindowGroupBlockProps> = React.memo((props) => {
	const { block, cx, gapPx = 1 } = props;
	const { startMs, endMs, app, segments } = block;
	const color = app.color ?? '#9ca3af';
	const isDark = isColorDark(color);

	const { leftPx, widthPx } = useCombinedCompute(
		[cx.$zoom, cx.$containerRect] as const,
		() => ({
			leftPx: cx.msToPx(startMs),
			widthPx: cx.msToPx(endMs) - cx.msToPx(startMs)
		}),
		[cx, startMs, endMs],
		{ isEqual: false }
	);

	return (
		<div
			className={cn(
				'absolute top-1 bottom-1 overflow-hidden rounded',
				isDark && 'border border-white/30'
			)}
			style={{
				left: leftPx + gapPx,
				width: Math.max(widthPx - gapPx * 2, 2),
				backgroundColor: color
			}}
		>
			{segments.map((segment, index) => (
				<WindowSegment
					key={`${segment.startMs}-${index}`}
					segment={segment}
					app={app}
					cx={cx}
					groupLeftPx={leftPx}
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
	const { segment, app, cx, groupLeftPx, gapPx, showDivider } = props;
	const { leftPx, widthPx, visibleLeftPx, visibleWidthPx } = useBlockPosition(segment, cx);
	const color = app.color ?? '#9ca3af';
	const adjustedLeftPx = leftPx - groupLeftPx - gapPx;
	const durationSec = (segment.endMs - segment.startMs) / 1000;

	const handleClick = React.useCallback(() => {
		cx.timelineCx.zoomToRange(segment.startMs, segment.endMs, 0.7);
	}, [cx, segment.startMs, segment.endMs]);

	return (
		<div
			className="absolute inset-y-0 transition-opacity hover:opacity-80"
			style={{ left: adjustedLeftPx, width: Math.max(widthPx, 2), backgroundColor: color }}
		>
			{showDivider && (
				<div className="absolute inset-y-0 right-0 border-r border-dashed border-white/30" />
			)}

			<Tooltip
				content={<SegmentTooltip segment={segment} app={app} durationSec={durationSec} />}
				side="top"
				positionerClassName="z-50"
			>
				<div
					className="absolute inset-y-0 cursor-pointer"
					style={{ left: visibleLeftPx, width: Math.max(visibleWidthPx, 2) }}
					onClick={handleClick}
				/>
			</Tooltip>
		</div>
	);
});
WindowSegment.displayName = 'WindowSegment';

interface TWindowSegmentProps {
	segment: TWindowSegment;
	app: TAppInfo;
	cx: ActivityRowCx;
	groupLeftPx: number;
	gapPx: number;
	showDivider: boolean;
}

// MARK: - Tooltip

const SegmentTooltip: React.FC<TSegmentTooltipProps> = (props) => {
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

interface TSegmentTooltipProps {
	segment: TWindowSegment;
	app: TAppInfo;
	durationSec: number;
}
