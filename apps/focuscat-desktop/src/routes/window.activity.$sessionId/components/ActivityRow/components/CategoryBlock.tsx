import { cn, formatDuration, isColorDark, Tooltip } from '@repo/ui';
import React from 'react';
import type { specta } from '@/environment';
import type { ActivityRowCx } from '../ActivityRowCx';
import { categoryToColor, categoryToLabel } from '../category';
import { useBlockStyle, useVisibleRangeStyle } from '../hooks';
import type { TCategoryBlock, TCategorySegment } from '../types';

export const CategoryBlock: React.FC<TCategoryBlockProps> = React.memo((props) => {
	const { block, cx, gapPx = 1 } = props;
	const blockRef = React.useRef<HTMLDivElement>(null);
	const dominantColor = categoryToColor(block.category);
	const isDark = isColorDark(dominantColor);

	useBlockStyle(blockRef, block, cx, { gapPx });

	return (
		<div
			ref={blockRef}
			className={cn(
				'absolute top-1 bottom-1 overflow-hidden rounded',
				isDark && 'border border-white/30'
			)}
			style={{ backgroundColor: dominantColor }}
		>
			{block.segments.map((segment, index) => (
				<CategorySegment
					key={`${segment.startMs}-${index}`}
					segment={segment}
					parentBlock={block}
					cx={cx}
					gapPx={gapPx}
					showDivider={index < block.segments.length - 1}
				/>
			))}
		</div>
	);
});
CategoryBlock.displayName = 'CategoryBlock';

interface TCategoryBlockProps {
	block: TCategoryBlock;
	cx: ActivityRowCx;
	gapPx?: number;
}

// MARK: - Segment

const CategorySegment: React.FC<TCategorySegmentProps> = React.memo((props) => {
	const { segment, parentBlock, cx, gapPx, showDivider } = props;
	const segmentRef = React.useRef<HTMLDivElement>(null);
	const triggerRef = React.useRef<HTMLDivElement>(null);
	const color = categoryToColor(segment.category);
	const isDark = isColorDark(color);
	const durationSec = (segment.endMs - segment.startMs) / 1000;

	const handleClick = React.useCallback(() => {
		cx.timelineCx.zoomToRange(segment.startMs, segment.endMs, 0.7);
	}, [cx, segment.startMs, segment.endMs]);

	useBlockStyle(segmentRef, segment, cx, { gapPx, parentBlock });
	useVisibleRangeStyle(triggerRef, segment, cx);

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
			<Tooltip
				content={<CategorySegmentTooltip segment={segment} durationSec={durationSec} />}
				side="top"
				positionerClassName="z-50"
			>
				<div ref={triggerRef} className="absolute inset-y-0 cursor-pointer" onClick={handleClick} />
			</Tooltip>
		</div>
	);
});
CategorySegment.displayName = 'CategorySegment';

interface TCategorySegmentProps {
	segment: TCategorySegment;
	parentBlock: TCategoryBlock;
	cx: ActivityRowCx;
	gapPx: number;
	showDivider: boolean;
}

// MARK: - Tooltip Content

const CategorySegmentTooltip: React.FC<TCategorySegmentTooltipProps> = (props) => {
	const { segment, durationSec } = props;
	const color = categoryToColor(segment.category);
	const apps = getAppsSortedByDuration(segment.activities);

	return (
		<div className="flex flex-col gap-2">
			{/* Category header */}
			<div className="flex items-center gap-2">
				<div className="size-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
				<span className="text-sm font-medium">{categoryToLabel(segment.category)}</span>
				<span className="text-base-500 text-xs">{formatDuration(durationSec)}</span>
			</div>

			{/* Contributing apps */}
			{apps.length > 0 && (
				<div className="border-base-200 flex flex-col gap-1 border-t pt-1.5">
					{apps.map(({ bundleId, name, icon, durationMs }) => (
						<div key={bundleId} className="flex items-center gap-1.5">
							{icon != null && <img src={icon} alt="" className="size-4 shrink-0 rounded" />}
							<span className="text-base-400 min-w-0 flex-1 truncate text-xs">{name}</span>
							<span className="text-base-500 text-xs">{formatDuration(durationMs / 1000)}</span>
						</div>
					))}
				</div>
			)}
		</div>
	);
};

interface TCategorySegmentTooltipProps {
	segment: TCategorySegment;
	durationSec: number;
}

// MARK: - Helpers

interface TAppEntry {
	bundleId: string;
	name: string;
	icon: string | null;
	durationMs: number;
}

function getAppsSortedByDuration(activities: specta.WindowActivityDto[]): TAppEntry[] {
	const map = new Map<string, TAppEntry>();
	for (const a of activities) {
		const id = a.appBundleId ?? 'unknown';
		const dur = a.endedAt - a.startedAt;
		const existing = map.get(id);
		if (existing != null) {
			existing.durationMs += dur;
		} else {
			map.set(id, {
				bundleId: id,
				name: a.appName ?? 'Unknown',
				icon: a.appIcon ?? null,
				durationMs: dur
			});
		}
	}
	return Array.from(map.values()).sort((a, b) => b.durationMs - a.durationMs);
}
