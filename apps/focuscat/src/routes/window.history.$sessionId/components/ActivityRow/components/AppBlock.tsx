import React from 'react';
import { Tooltip } from '@/components';
import { formatDuration } from '@/lib';
import type { ActivityRowCx } from '../ActivityRowCx';
import { useBlockPosition } from '../hooks';
import type { TAppBlock } from '../types';

export const AppBlock: React.FC<TAppBlockProps> = React.memo((props) => {
	const { block, cx, fallbackColor = '#9ca3af' } = props;
	const { leftPx, widthPx, visibleLeftPx, visibleWidthPx } = useBlockPosition(block, cx);
	const durationSec = React.useMemo(
		() => (block.endMs - block.startMs) / 1000,
		[block.endMs, block.startMs]
	);
	const dominantApp = React.useMemo(() => block.apps[0], [block.apps]);
	const color = dominantApp?.color ?? fallbackColor;

	if (dominantApp == null) {
		return null;
	}

	return (
		<div
			className="absolute top-1 bottom-1 overflow-hidden rounded transition-opacity hover:opacity-80"
			style={{
				left: leftPx,
				width: Math.max(widthPx, 2),
				backgroundColor: color
			}}
		>
			{/* Diagonal stripe overlay when multiple apps are merged */}
			{block.apps.length > 1 && (
				<div
					className="pointer-events-none absolute inset-0 opacity-20"
					style={{
						backgroundImage:
							'repeating-linear-gradient(45deg, transparent, transparent 4px, white 4px, white 8px)'
					}}
				/>
			)}

			{/* Tooltip anchor */}
			<Tooltip content={<AppTooltip block={block} durationSec={durationSec} />} side="top">
				<div
					className="absolute inset-y-0"
					style={{ left: visibleLeftPx, width: Math.max(visibleWidthPx, 2) }}
				/>
			</Tooltip>
		</div>
	);
});

AppBlock.displayName = 'AppBlock';

export interface TAppBlockProps {
	block: TAppBlock;
	cx: ActivityRowCx;
	fallbackColor?: string;
}

// MARK: - Tooltip

const AppTooltip: React.FC<TAppTooltipProps> = (props) => {
	const { block, durationSec } = props;
	const dominantApp = React.useMemo(() => block.apps[0], [block.apps]);

	if (dominantApp == null) {
		return null;
	}

	return (
		<div className="flex flex-col gap-2">
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
			{block.apps.length > 1 && (
				<div className="border-base-200 flex flex-wrap gap-1 border-t pt-2">
					{block.apps.map((app, i) => (
						<div key={i} className="flex items-center gap-1">
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

interface TAppTooltipProps {
	block: TAppBlock;
	durationSec: number;
}
