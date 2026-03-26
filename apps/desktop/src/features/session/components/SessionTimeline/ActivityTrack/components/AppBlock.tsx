import { cn, isColorDark, Tooltip } from '@repo/ui';
import React from 'react';
import type { ActivityTrackCx } from '../ActivityTrackCx';
import { useBlockStyle, useVisibleRangeStyle } from '../hooks';
import type { TAppBlock } from '../types';
import { AppBlockTooltip } from './AppBlockTooltip';

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
				content={<AppBlockTooltip block={block} durationSec={durationSec} />}
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
	cx: ActivityTrackCx;
	gapPx?: number;
	fallbackColor?: string;
}
