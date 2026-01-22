import React from 'react';
import { Tooltip } from '@/components';
import { cn, formatDuration } from '@/lib';
import type { ActivityRowCx } from '../ActivityRowCx';
import { useBlockPosition } from '../hooks';
import type { TWindowBlock } from '../types';

export const WindowBlock: React.FC<TWindowBlockProps> = React.memo((props) => {
	const { block, cx, fallbackColor = '#9ca3af' } = props;
	const { leftPx, widthPx, visibleLeftPx, visibleWidthPx } = useBlockPosition(block, cx);
	const durationSec = (block.endMs - block.startMs) / 1000;
	const color = block.app.color ?? fallbackColor;

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
				<div className="absolute inset-y-0 right-0 border-r border-dashed border-white/30" />
			)}

			{/* Tooltip anchor */}
			<Tooltip
				content={<WindowTooltip block={block} durationSec={durationSec} />}
				side="top"
				positionerClassName="z-50"
			>
				<div
					className="absolute inset-y-0"
					style={{ left: visibleLeftPx, width: Math.max(visibleWidthPx, 2) }}
				/>
			</Tooltip>
		</div>
	);
});

WindowBlock.displayName = 'WindowBlock';

export interface TWindowBlockProps {
	block: TWindowBlock;
	cx: ActivityRowCx;
	fallbackColor?: string;
}

// MARK: - Tooltip

const WindowTooltip: React.FC<TWindowTooltipProps> = (props) => {
	const { block, durationSec } = props;
	const { app, windows } = block;
	const firstWindow = windows[0];

	return (
		<div className="flex items-center gap-2.5">
			{app.icon != null && <img src={app.icon} alt="" className="size-8 shrink-0 rounded" />}
			<div className="flex min-w-0 flex-col gap-0.5">
				<span className="truncate text-sm font-medium">{app.name}</span>
				{windows.length === 1 && firstWindow?.windowTitle != null ? (
					<span className="text-base-400 truncate text-xs">{firstWindow.windowTitle}</span>
				) : windows.length > 1 ? (
					<span className="text-base-400 truncate text-xs">{windows.length} windows</span>
				) : null}
				<span className="text-base-500 text-xs">{formatDuration(durationSec)}</span>
			</div>
		</div>
	);
};

interface TWindowTooltipProps {
	block: TWindowBlock;
	durationSec: number;
}
