import React from 'react';
import { Tooltip } from '@/components';
import { cn, formatDuration, isColorDark } from '@/lib';
import type { ActivityRowCx } from '../ActivityRowCx';
import { useBlockStyle, useVisibleRangeStyle } from '../hooks';
import type { TAppBlock } from '../types';

export const AppBlock: React.FC<TAppBlockProps> = React.memo((props) => {
	const { block, cx, gapPx = 1, fallbackColor = '#9ca3af' } = props;
	const blockRef = React.useRef<HTMLDivElement>(null);
	const triggerRef = React.useRef<HTMLDivElement>(null);

	const dominantApp = block.apps[0];
	const color = dominantApp?.color ?? fallbackColor;
	const isDark = isColorDark(color);
	const durationSec = (block.endMs - block.startMs) / 1000;

	// MARK: - Actions

	const handleClick = React.useCallback(() => {
		cx.timelineCx.zoomToRange(block.startMs, block.endMs, 0.7);
	}, [cx, block.startMs, block.endMs]);

	// MARK: - Effects

	useBlockStyle(blockRef, block, cx, { gapPx });
	useVisibleRangeStyle(triggerRef, block, cx, { offsetPx: gapPx });

	// MARK: - UI

	if (dominantApp == null) {
		return null;
	}

	return (
		<div
			ref={blockRef}
			className={cn(
				'absolute top-1 bottom-1 overflow-hidden rounded transition-opacity hover:opacity-80',
				isDark && 'border border-white/30'
			)}
			style={{ backgroundColor: color }}
		>
			{/* Stripe overlay for merged apps */}
			{block.apps.length > 1 && (
				<div
					className="pointer-events-none absolute inset-0 opacity-20"
					style={{
						backgroundImage:
							'repeating-linear-gradient(45deg, transparent, transparent 4px, white 4px, white 8px)'
					}}
				/>
			)}

			{/* Tooltip trigger */}
			<Tooltip
				content={<AppTooltipContent block={block} durationSec={durationSec} />}
				side="top"
				positionerClassName="z-50"
			>
				<div ref={triggerRef} className="absolute inset-y-0 cursor-pointer" onClick={handleClick} />
			</Tooltip>
		</div>
	);
});
AppBlock.displayName = 'AppBlock';

interface TAppBlockProps {
	block: TAppBlock;
	cx: ActivityRowCx;
	gapPx?: number;
	fallbackColor?: string;
}

// MARK: - Tooltip Content

const AppTooltipContent: React.FC<TAppTooltipContentProps> = (props) => {
	const { block, durationSec } = props;
	const dominantApp = block.apps[0];

	if (dominantApp == null) {
		return null;
	}

	return (
		<div className="flex flex-col gap-2">
			{/* Primary app info */}
			<div className="flex items-center gap-2.5">
				{dominantApp.icon != null && (
					<img src={dominantApp.icon} alt="" className="size-8 shrink-0 rounded" />
				)}
				<div className="flex min-w-0 flex-col gap-0.5">
					<span className="truncate text-sm font-medium">{dominantApp.name}</span>
					<span className="text-base-400 truncate text-xs">
						{block.apps.length} apps · {block.activities.length} activities
					</span>
					<span className="text-base-500 text-xs">{formatDuration(durationSec)}</span>
				</div>
			</div>

			{/* Additional apps list */}
			{block.apps.length > 1 && (
				<div className="border-base-200 flex flex-wrap gap-1 border-t pt-2">
					{block.apps.map((app) => (
						<div key={app.bundleId} className="flex items-center gap-1">
							{app.icon != null && (
								<img src={app.icon} alt="" className="size-4 shrink-0 rounded" />
							)}
							<span className="text-base-400 text-xs">{app.name}</span>
						</div>
					))}
				</div>
			)}
		</div>
	);
};

interface TAppTooltipContentProps {
	block: TAppBlock;
	durationSec: number;
}
