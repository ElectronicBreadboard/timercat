import { useCombinedCompute } from 'feature-react/state';
import React from 'react';
import { Tooltip, TooltipProvider, useTimelineCx } from '@/components';
import { specta } from '@/environment';
import { cn, formatDuration } from '@/lib';

import { createBlocks } from './create-blocks';
import type { TActivityBlock, TAppBlock, TClusterBlock, TWindowBlock } from './types';

const FALLBACK_COLOR = '#9ca3af';

export const ActivityRow: React.FC<TActivityRowProps> = (props) => {
	const { activities } = props;
	const cx = useTimelineCx();

	// Create blocks with density-based aggregation
	// Recalculates when zoom changes (affects msToPx)
	// Blocks are clamped to session boundaries
	const blocks = useCombinedCompute(
		[cx.$zoom, cx.$containerRect] as const,
		() =>
			createBlocks(activities, (ms) => cx.msToPx(ms), {
				bounds: { startMs: cx.startMs, endMs: cx.endMs }
			}),
		[activities, cx],
		{ isEqual: false }
	);

	return (
		<TooltipProvider delay={200} closeDelay={100}>
			<div className="bg-base-100 relative h-10">
				{blocks.map((block, index) => (
					<BlockRenderer key={`${block.startMs}-${index}`} block={block} cx={cx} />
				))}
			</div>
		</TooltipProvider>
	);
};

export interface TActivityRowProps {
	activities: specta.WindowActivityDto[];
}

// MARK: - Block Renderer

const BlockRenderer: React.FC<TBlockRendererProps> = ({ block, cx }) => {
	switch (block.type) {
		case 'window':
			return <WindowBlock block={block} cx={cx} />;
		case 'app':
			return <AppBlock block={block} cx={cx} />;
		case 'cluster':
			return <ClusterBlock block={block} cx={cx} />;
	}
};

interface TBlockRendererProps {
	block: TActivityBlock;
	cx: ReturnType<typeof useTimelineCx>;
}

// MARK: - Window Block

const WindowBlock: React.FC<TWindowBlockProps> = React.memo(({ block, cx }) => {
	const { leftPx, widthPx } = useCombinedCompute(
		[cx.$zoom, cx.$containerRect] as const,
		() => {
			const left = cx.msToPx(block.startMs);
			const right = cx.msToPx(block.endMs);
			return { leftPx: left, widthPx: right - left };
		},
		[cx, block.startMs, block.endMs],
		{ isEqual: false }
	);

	const durationSec = (block.endMs - block.startMs) / 1000;
	const color = block.activity.appColor ?? FALLBACK_COLOR;
	const appName = block.activity.appName ?? 'Unknown';

	const roundedClass =
		block.isAppStart && block.isAppEnd
			? 'rounded'
			: block.isAppStart
				? 'rounded-l'
				: block.isAppEnd
					? 'rounded-r'
					: '';

	const dividerColor = isColorDark(color) ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)';

	return (
		<Tooltip
			content={
				<BlockTooltip
					appName={appName}
					appIcon={block.activity.appIcon}
					subtitle={block.activity.windowTitle}
					durationSec={durationSec}
				/>
			}
			side="top"
		>
			<div
				className={cn('absolute top-1 bottom-1 transition-opacity hover:opacity-80', roundedClass)}
				style={{
					left: leftPx,
					width: Math.max(widthPx, 2),
					backgroundColor: color
				}}
			>
				{!block.isAppStart && (
					<div
						className="absolute top-0 bottom-0 left-0 w-px"
						style={{
							background: `repeating-linear-gradient(to bottom, transparent, transparent 2px, ${dividerColor} 2px, ${dividerColor} 4px)`
						}}
					/>
				)}
			</div>
		</Tooltip>
	);
});

WindowBlock.displayName = 'WindowBlock';

interface TWindowBlockProps {
	block: TWindowBlock;
	cx: ReturnType<typeof useTimelineCx>;
}

// MARK: - App Block

const AppBlock: React.FC<TAppBlockProps> = React.memo(({ block, cx }) => {
	const { leftPx, widthPx } = useCombinedCompute(
		[cx.$zoom, cx.$containerRect] as const,
		() => {
			const left = cx.msToPx(block.startMs);
			const right = cx.msToPx(block.endMs);
			return { leftPx: left, widthPx: right - left };
		},
		[cx, block.startMs, block.endMs],
		{ isEqual: false }
	);

	const durationSec = (block.endMs - block.startMs) / 1000;
	const color = block.appColor ?? FALLBACK_COLOR;

	return (
		<Tooltip
			content={
				<BlockTooltip
					appName={block.appName}
					appIcon={block.appIcon}
					subtitle={`${block.windowCount} windows`}
					durationSec={durationSec}
				/>
			}
			side="top"
		>
			<div
				className="absolute top-1 bottom-1 rounded transition-opacity hover:opacity-80"
				style={{
					left: leftPx,
					width: Math.max(widthPx, 2),
					backgroundColor: color
				}}
			/>
		</Tooltip>
	);
});

AppBlock.displayName = 'AppBlock';

interface TAppBlockProps {
	block: TAppBlock;
	cx: ReturnType<typeof useTimelineCx>;
}

// MARK: - Cluster Block

const ClusterBlock: React.FC<TClusterBlockProps> = React.memo(({ block, cx }) => {
	const { leftPx, widthPx } = useCombinedCompute(
		[cx.$zoom, cx.$containerRect] as const,
		() => {
			const left = cx.msToPx(block.startMs);
			const right = cx.msToPx(block.endMs);
			return { leftPx: left, widthPx: right - left };
		},
		[cx, block.startMs, block.endMs],
		{ isEqual: false }
	);

	const durationSec = (block.endMs - block.startMs) / 1000;
	const color = block.dominantApp.appColor ?? FALLBACK_COLOR;

	return (
		<Tooltip
			content={
				<BlockTooltip
					appName={block.dominantApp.appName}
					appIcon={block.dominantApp.appIcon}
					subtitle={`${block.appCount} apps · ${block.activityCount} activities`}
					durationSec={durationSec}
				/>
			}
			side="top"
		>
			<div
				className="absolute top-1 bottom-1 rounded transition-opacity hover:opacity-80"
				style={{
					left: leftPx,
					width: Math.max(widthPx, 2),
					backgroundColor: color
				}}
			>
				{/* Indicator that this is a cluster (subtle pattern) */}
				<div
					className="absolute inset-0 rounded opacity-30"
					style={{
						background: `repeating-linear-gradient(
							45deg,
							transparent,
							transparent 3px,
							rgba(255,255,255,0.2) 3px,
							rgba(255,255,255,0.2) 6px
						)`
					}}
				/>
			</div>
		</Tooltip>
	);
});

ClusterBlock.displayName = 'ClusterBlock';

interface TClusterBlockProps {
	block: TClusterBlock;
	cx: ReturnType<typeof useTimelineCx>;
}

// MARK: - Tooltip

const BlockTooltip: React.FC<TBlockTooltipProps> = (props) => {
	const { appName, appIcon, subtitle, durationSec } = props;

	return (
		<div className="flex max-w-xs items-center gap-2.5">
			{appIcon != null && <img src={appIcon} alt="" className="size-8 shrink-0 rounded" />}
			<div className="flex min-w-0 flex-col gap-0.5">
				<span className="truncate text-sm font-medium">{appName}</span>
				{subtitle != null && <span className="text-base-400 truncate text-xs">{subtitle}</span>}
				<span className="text-base-500 text-xs">{formatDuration(durationSec)}</span>
			</div>
		</div>
	);
};

interface TBlockTooltipProps {
	appName: string;
	appIcon: string | null;
	subtitle: string | null;
	durationSec: number;
}

// MARK: - Helpers

function isColorDark(hex: string): boolean {
	const rgb = hexToRgb(hex);
	if (rgb == null) return false;
	const luminance = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
	return luminance < 0.5;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	if (result == null) return null;
	return {
		r: parseInt(result[1]!, 16),
		g: parseInt(result[2]!, 16),
		b: parseInt(result[3]!, 16)
	};
}
