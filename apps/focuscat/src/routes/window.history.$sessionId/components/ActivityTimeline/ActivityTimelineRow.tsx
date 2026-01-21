import { useCombinedCompute } from 'feature-react/state';
import React from 'react';
import { Tooltip, TooltipProvider, useTimelineCx } from '@/components';
import { specta } from '@/environment';
import { cn, formatDuration } from '@/lib';
import { createActivityBlocks } from './create-blocks';
import type { TActivityBlock } from './types';

export const ActivityTimelineRow: React.FC<TActivityTimelineRowProps> = (props) => {
	const {
		activities,
		minBlockPx = 10,
		minAppWidthForWindowsPx = 50,
		fallbackColor = '#9ca3af',
		className
	} = props;
	const cx = useTimelineCx();

	const blocks = useCombinedCompute(
		[cx.$zoom, cx.$containerRect] as const,
		() => {
			if (activities.length === 0) return [];
			const sorted = [...activities].sort((a, b) => a.startedAt - b.startedAt);
			return createActivityBlocks(sorted, (ms) => cx.msToPx(ms), {
				minBlockPx,
				minAppWidthForWindowsPx,
				fallbackColor
			});
		},
		[activities, cx, minBlockPx, minAppWidthForWindowsPx, fallbackColor],
		{ isEqual: false }
	);

	if (activities.length === 0) {
		return (
			<div className={cn('bg-base-100 flex h-10 items-center px-2', className)}>
				<span className="text-base-400 text-xs">No activity</span>
			</div>
		);
	}

	return (
		<TooltipProvider delay={200} closeDelay={100}>
			<div className={cn('bg-base-100 relative h-10', className)}>
				{blocks.map((block, index) => (
					<BlockRenderer key={index} block={block} />
				))}
			</div>
		</TooltipProvider>
	);
};

const BlockRenderer: React.FC<{ block: TActivityBlock }> = (props) => {
	const { block } = props;

	// Determine rounded corners based on block type and position
	const roundedClass = React.useMemo(() => {
		// App and cluster blocks are always fully rounded
		if (block.type === 'app' || block.type === 'cluster') {
			return 'rounded';
		}
		// Window blocks: round based on position in app group
		if (block.isAppStart && block.isAppEnd) return 'rounded';
		if (block.isAppStart) return 'rounded-l';
		if (block.isAppEnd) return 'rounded-r';
		return '';
	}, [block.type, block.isAppStart, block.isAppEnd]);

	// Window blocks that are not the first show a left divider for separation
	const showLeftDivider = block.type === 'window' && !block.isAppStart;

	return (
		<Tooltip content={<BlockTooltip block={block} />} side="bottom">
			<div
				className={cn('absolute top-1 bottom-1 transition-opacity hover:opacity-80', roundedClass)}
				style={{
					left: block.leftPx,
					width: Math.max(block.widthPx, 2),
					backgroundColor: block.color
				}}
			>
				{/* Left divider for non-first window blocks */}
				{showLeftDivider && (
					<div
						className="absolute top-0 bottom-0 left-0 w-px"
						style={{
							background:
								'repeating-linear-gradient(to bottom, transparent, transparent 2px, rgba(0,0,0,0.2) 2px, rgba(0,0,0,0.2) 4px)'
						}}
					/>
				)}
				{/* Internal dividers for app blocks */}
				{block.dividers.map((dividerPx, i) => (
					<div
						key={i}
						className="absolute top-0 bottom-0 w-px"
						style={{
							left: dividerPx,
							background:
								'repeating-linear-gradient(to bottom, transparent, transparent 2px, rgba(0,0,0,0.2) 2px, rgba(0,0,0,0.2) 4px)'
						}}
					/>
				))}
			</div>
		</Tooltip>
	);
};

const BlockTooltip: React.FC<{ block: TActivityBlock }> = (props) => {
	const { block } = props;

	return (
		<div className="flex max-w-xs items-center gap-2.5">
			{block.appIcon != null && (
				<img src={block.appIcon} alt="" className="size-8 shrink-0 rounded" />
			)}
			<div className="flex min-w-0 flex-col gap-0.5">
				<span className="truncate text-sm font-medium">{block.appName}</span>

				{/* Window title for single windows */}
				{block.type === 'window' && block.windowTitle != null && (
					<span className="text-base-400 truncate text-xs">{block.windowTitle}</span>
				)}

				{/* Window count for app blocks */}
				{block.type === 'app' && block.windowCount > 1 && (
					<span className="text-base-400 text-xs">{block.windowCount} windows</span>
				)}

				{/* App count for clusters */}
				{block.type === 'cluster' && (
					<span className="text-base-400 text-xs">
						{block.appCount} apps · {block.windowCount} windows
					</span>
				)}

				<span className="text-base-500 text-xs">{formatDuration(block.durationSec)}</span>
			</div>
		</div>
	);
};

export interface TActivityTimelineRowProps {
	activities: specta.WindowActivityDto[];
	/** Minimum width in pixels for any block (default: 10) */
	minBlockPx?: number;
	/** Minimum app width to show individual windows instead of merged app block (default: 50) */
	minAppWidthForWindowsPx?: number;
	fallbackColor?: string;
	className?: string;
}
