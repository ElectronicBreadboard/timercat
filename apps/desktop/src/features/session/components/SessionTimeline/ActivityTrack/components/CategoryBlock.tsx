import { cn, isColorDark, Tooltip } from '@repo/ui';
import React from 'react';
import type { specta } from '@/environment';
import { categoryToColor, FocusCategoryTooltip } from '@/features/focus';
import type { ActivityTrackCx } from '../ActivityTrackCx';
import { useBlockStyle, useVisibleRangeStyle } from '../hooks';
import type { TCategoryBlock } from '../types';

export const CategoryBlock: React.FC<TCategoryBlockProps> = React.memo((props) => {
	const { block, cx, gapPx = 1 } = props;
	const blockRef = React.useRef<HTMLDivElement>(null);
	const triggerRef = React.useRef<HTMLDivElement>(null);

	const dominantCategory = block.categories[0]?.category ?? block.category;
	const color = categoryToColor(dominantCategory);
	const isDark = isColorDark(color);

	// Clip activities to the block's visible bounds
	const visibleActivities = React.useMemo(() => clipActivitiesToBlock(block), [block]);

	const handleClick = React.useCallback(() => {
		cx.timelineCx.zoomToRange(block.startMs, block.endMs, 0.7);
	}, [cx, block.startMs, block.endMs]);

	useBlockStyle(blockRef, block, cx, { gapPx });
	useVisibleRangeStyle(triggerRef, block, cx, { offsetPx: gapPx });

	return (
		<div
			ref={blockRef}
			className={cn(
				'absolute top-1 bottom-1 overflow-hidden rounded transition-opacity hover:opacity-80',
				isDark && 'border border-white/30'
			)}
			style={{ backgroundColor: color }}
		>
			{block.categories.length > 1 && (
				<div
					className="pointer-events-none absolute inset-0 opacity-20"
					style={{
						backgroundImage:
							'repeating-linear-gradient(45deg, transparent, transparent 4px, white 4px, white 8px)'
					}}
				/>
			)}

			<Tooltip
				content={
					<FocusCategoryTooltip
						category={dominantCategory}
						durationMs={block.endMs - block.startMs}
						activities={visibleActivities}
						categories={block.categories.length > 1 ? block.categories : undefined}
					/>
				}
				side="top"
				positionerClassName="z-50"
			>
				<div ref={triggerRef} className="absolute inset-y-0 cursor-pointer" onClick={handleClick} />
			</Tooltip>
		</div>
	);
});
CategoryBlock.displayName = 'CategoryBlock';

interface TCategoryBlockProps {
	block: TCategoryBlock;
	cx: ActivityTrackCx;
	gapPx?: number;
}

function clipActivitiesToBlock(block: TCategoryBlock): specta.WindowActivityDto[] {
	return block.activities.flatMap((activity) => {
		const startedAt = Math.max(activity.startedAt, block.startMs);
		const endedAt = Math.min(activity.endedAt, block.endMs);
		if (endedAt <= startedAt) return [];
		return [{ ...activity, startedAt, endedAt }];
	});
}
