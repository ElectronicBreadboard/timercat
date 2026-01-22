import { useCombinedCompute } from 'feature-react/state';
import React from 'react';
import { Tooltip, TooltipProvider, useTimelineCx } from '@/components';
import { cn } from '@/lib';
import { specta } from '@/environment';
import { formatDuration } from '@/lib';

import { createBlocks } from './create-blocks';
import type { TActivityBlock, TAppMergedBlock, TWindowBlock, TWindowMergedBlock } from './types';

const FALLBACK_COLOR = '#9ca3af';

export const ActivityRow: React.FC<TActivityRowProps> = (props) => {
	const { activities } = props;
	const cx = useTimelineCx();

	// Get the current resolution - this only changes at discrete thresholds
	const resolution = useCombinedCompute(
		[cx.$zoom, cx.$containerRect] as const,
		() => cx.getMarkerResolution(),
		[cx],
		{ isEqual: false }
	);

	// Blocks recalculate only when resolution changes (stable during smooth zoom)
	const blocks = React.useMemo(() => {
		return createBlocks(activities, {
			bounds: { startMs: cx.startMs, endMs: cx.endMs },
			msToPx: (ms) => cx.msToPx(ms)
		});
	}, [activities, cx, resolution]);

	return (
		<TooltipProvider delay={200} closeDelay={100}>
			<div className="bg-base-100 relative h-10">
				{blocks.map((block, index) => (
					<ActivityBlockView key={`${block.startMs}-${index}`} block={block} cx={cx} />
				))}
			</div>
		</TooltipProvider>
	);
};

export interface TActivityRowProps {
	activities: specta.WindowActivityDto[];
}

// MARK: - Activity Block View

const ActivityBlockView: React.FC<TActivityBlockViewProps> = React.memo(({ block, cx }) => {
	switch (block.type) {
		case 'window':
			return <WindowBlockView block={block} cx={cx} />;
		case 'window-merged':
			return <WindowMergedBlockView block={block} cx={cx} />;
		case 'app-merged':
			return <AppMergedBlockView block={block} cx={cx} />;
	}
});

ActivityBlockView.displayName = 'ActivityBlockView';

interface TActivityBlockViewProps {
	block: TActivityBlock;
	cx: ReturnType<typeof useTimelineCx>;
}

// MARK: - Window Block View

const WindowBlockView: React.FC<TWindowBlockViewProps> = React.memo(({ block, cx }) => {
	const { leftPx, widthPx, visibleLeftPx, visibleWidthPx } = useBlockPosition(block, cx);
	const durationSec = (block.endMs - block.startMs) / 1000;
	const color = block.activity.appColor ?? FALLBACK_COLOR;

	return (
		<div
			className={cn(
				'absolute top-1 bottom-1 transition-opacity hover:opacity-80',
				block.position === 'solo' && 'rounded',
				block.position === 'start' && 'rounded-l',
				block.position === 'end' && 'rounded-r'
			)}
			style={{
				left: leftPx,
				width: Math.max(widthPx, 2),
				backgroundColor: color
			}}
		>
			{/* Dashed divider on right for start/center positions */}
			{(block.position === 'start' || block.position === 'center') && (
				<div className="absolute right-0 inset-y-0 border-r border-dashed border-white/30" />
			)}

			{/* Tooltip anchor */}
			<Tooltip
				content={<WindowTooltip block={block} durationSec={durationSec} />}
				side="top"
			>
				<div
					className="absolute inset-y-0"
					style={{ left: visibleLeftPx, width: Math.max(visibleWidthPx, 2) }}
				/>
			</Tooltip>
		</div>
	);
});

WindowBlockView.displayName = 'WindowBlockView';

interface TWindowBlockViewProps {
	block: TWindowBlock;
	cx: ReturnType<typeof useTimelineCx>;
}

// MARK: - WindowMerged Block View

const WindowMergedBlockView: React.FC<TWindowMergedBlockViewProps> = React.memo(({ block, cx }) => {
	const { leftPx, widthPx, visibleLeftPx, visibleWidthPx } = useBlockPosition(block, cx);
	const durationSec = (block.endMs - block.startMs) / 1000;
	const color = block.appColor ?? FALLBACK_COLOR;

	return (
		<div
			className="absolute top-1 bottom-1 rounded transition-opacity hover:opacity-80"
			style={{
				left: leftPx,
				width: Math.max(widthPx, 2),
				backgroundColor: color
			}}
		>
			<Tooltip content={<WindowMergedTooltip block={block} durationSec={durationSec} />} side="top">
				<div
					className="absolute inset-y-0"
					style={{ left: visibleLeftPx, width: Math.max(visibleWidthPx, 2) }}
				/>
			</Tooltip>
		</div>
	);
});

WindowMergedBlockView.displayName = 'WindowMergedBlockView';

interface TWindowMergedBlockViewProps {
	block: TWindowMergedBlock;
	cx: ReturnType<typeof useTimelineCx>;
}

// MARK: - AppMerged Block View

const AppMergedBlockView: React.FC<TAppMergedBlockViewProps> = React.memo(({ block, cx }) => {
	const { leftPx, widthPx, visibleLeftPx, visibleWidthPx } = useBlockPosition(block, cx);
	const durationSec = (block.endMs - block.startMs) / 1000;
	const color = block.dominantApp.appColor ?? FALLBACK_COLOR;

	return (
		<div
			className="absolute top-1 bottom-1 rounded overflow-hidden transition-opacity hover:opacity-80"
			style={{
				left: leftPx,
				width: Math.max(widthPx, 2),
				backgroundColor: color
			}}
		>
			{/* Diagonal stripe overlay for merged app blocks */}
			<div
				className="absolute inset-0 opacity-20 pointer-events-none"
				style={{
					backgroundImage:
						'repeating-linear-gradient(45deg, transparent, transparent 4px, white 4px, white 8px)'
				}}
			/>

			<Tooltip content={<AppMergedTooltip block={block} durationSec={durationSec} />} side="top">
				<div
					className="absolute inset-y-0"
					style={{ left: visibleLeftPx, width: Math.max(visibleWidthPx, 2) }}
				/>
			</Tooltip>
		</div>
	);
});

AppMergedBlockView.displayName = 'AppMergedBlockView';

interface TAppMergedBlockViewProps {
	block: TAppMergedBlock;
	cx: ReturnType<typeof useTimelineCx>;
}

// MARK: - Tooltips

const WindowTooltip: React.FC<{ block: TWindowBlock; durationSec: number }> = ({
	block,
	durationSec
}) => {
	const { activity } = block;

	return (
		<div className="flex items-center gap-2.5">
			{activity.appIcon != null && (
				<img src={activity.appIcon} alt="" className="size-8 shrink-0 rounded" />
			)}
			<div className="flex min-w-0 flex-col gap-0.5">
				<span className="truncate text-sm font-medium">{activity.appName ?? 'Unknown'}</span>
				{activity.windowTitle != null && (
					<span className="text-base-400 truncate text-xs">{activity.windowTitle}</span>
				)}
				<span className="text-base-500 text-xs">{formatDuration(durationSec)}</span>
			</div>
		</div>
	);
};

const WindowMergedTooltip: React.FC<{ block: TWindowMergedBlock; durationSec: number }> = ({
	block,
	durationSec
}) => {
	return (
		<div className="flex items-center gap-2.5">
			{block.appIcon != null && (
				<img src={block.appIcon} alt="" className="size-8 shrink-0 rounded" />
			)}
			<div className="flex min-w-0 flex-col gap-0.5">
				<span className="truncate text-sm font-medium">{block.appName}</span>
				{block.windows.length > 1 && (
					<span className="text-base-400 truncate text-xs">
						{block.windows.length} windows
					</span>
				)}
				<span className="text-base-500 text-xs">{formatDuration(durationSec)}</span>
			</div>
		</div>
	);
};

const AppMergedTooltip: React.FC<{ block: TAppMergedBlock; durationSec: number }> = ({
	block,
	durationSec
}) => {
	return (
		<div className="flex flex-col gap-2">
			<div className="flex items-center gap-2.5">
				{block.dominantApp.appIcon != null && (
					<img src={block.dominantApp.appIcon} alt="" className="size-8 shrink-0 rounded" />
				)}
				<div className="flex min-w-0 flex-col gap-0.5">
					<span className="truncate text-sm font-medium">{block.dominantApp.appName}</span>
					<span className="text-base-400 truncate text-xs">
						{block.uniqueApps.length} apps · {block.activities.length} activities
					</span>
					<span className="text-base-500 text-xs">{formatDuration(durationSec)}</span>
				</div>
			</div>
			{block.uniqueApps.length > 1 && (
				<div className="border-base-200 flex flex-wrap gap-1 border-t pt-2">
					{block.uniqueApps.map((app, i) => (
						<div key={i} className="flex items-center gap-1">
							{app.appIcon != null && (
								<img src={app.appIcon} alt="" className="size-4 shrink-0 rounded" />
							)}
							<span className="text-base-400 text-xs">{app.appName}</span>
						</div>
					))}
				</div>
			)}
		</div>
	);
};

// MARK: - Hooks

function useBlockPosition(block: TActivityBlock, cx: ReturnType<typeof useTimelineCx>) {
	return useCombinedCompute(
		[cx.$zoom, cx.$containerRect, cx.$scrollLeft] as const,
		() => {
			const left = cx.msToPx(block.startMs);
			const right = cx.msToPx(block.endMs);
			const width = right - left;

			// Calculate visible portion for tooltip positioning
			const scrollLeft = cx.$scrollLeft.get();
			const containerWidth = cx.containerWidth;
			const visibleStart = scrollLeft;
			const visibleEnd = scrollLeft + containerWidth;

			// Clamp block to visible area
			const clampedLeft = Math.max(left, visibleStart);
			const clampedRight = Math.min(right, visibleEnd);
			const visibleWidth = Math.max(0, clampedRight - clampedLeft);

			return {
				leftPx: left,
				widthPx: width,
				visibleLeftPx: clampedLeft - left,
				visibleWidthPx: visibleWidth
			};
		},
		[cx, block.startMs, block.endMs],
		{ isEqual: false }
	);
}
