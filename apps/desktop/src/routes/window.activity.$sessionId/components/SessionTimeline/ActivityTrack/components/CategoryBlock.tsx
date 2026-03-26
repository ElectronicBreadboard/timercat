import { cn, formatDuration, isColorDark, Tooltip } from '@repo/ui';
import React from 'react';
import type { specta } from '@/environment';
import { categoryToColor, categoryToLabel } from '../../focus-category';
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
	const durationSec = (block.endMs - block.startMs) / 1000;

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
				content={<CategoryTooltipContent block={block} durationSec={durationSec} />}
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

const CategoryTooltipContent: React.FC<TCategoryTooltipContentProps> = (props) => {
	const { block, durationSec } = props;
	const visibleActivities = React.useMemo(() => getVisibleActivities(block), [block]);
	const categories = React.useMemo(
		() => getCategoriesSortedByDuration(visibleActivities),
		[visibleActivities]
	);
	const dominantCategory = categories[0]?.category ?? block.category;
	const isGrouped = categories.length > 1;
	const usageEntries = React.useMemo(
		() => getUsageEntriesSortedByDuration(visibleActivities).slice(0, 3),
		[visibleActivities]
	);

	return (
		<div className="flex flex-col gap-2">
			<div className="flex items-center gap-2">
				<div
					className="size-2 shrink-0 rounded-full"
					style={{ backgroundColor: categoryToColor(dominantCategory) }}
				/>
				<span className="text-sm font-medium">{categoryToLabel(dominantCategory)}</span>
				<span className="text-base-500 text-xs">{formatDuration(durationSec)}</span>
			</div>

			<span className="text-base-400 text-xs">
				{categories.length} {categories.length === 1 ? 'category' : 'categories'} ·{' '}
				{visibleActivities.length} {visibleActivities.length === 1 ? 'activity' : 'activities'}
			</span>

			{isGrouped ? (
				<div className="border-base-200 flex flex-col gap-1 border-t pt-1.5">
					{categories.map(({ category, durationMs }) => (
						<div key={category ?? 'uncategorized'} className="flex items-center gap-1.5">
							<div
								className="size-2 shrink-0 rounded-full"
								style={{ backgroundColor: categoryToColor(category) }}
							/>
							<span className="text-base-400 min-w-0 flex-1 truncate text-xs">
								{categoryToLabel(category)}
							</span>
							<span className="text-base-500 shrink-0 text-xs">
								{formatDuration(durationMs / 1000)}
							</span>
						</div>
					))}
				</div>
			) : (
				usageEntries.length > 0 && (
					<div className="border-base-200 flex flex-col gap-1 border-t pt-1.5">
						{usageEntries.map((entry) => (
							<div key={entry.id} className="flex items-center gap-1.5">
								{entry.icon != null ? (
									<img src={entry.icon} alt="" className="size-4 shrink-0 rounded" />
								) : (
									<div className="bg-base-300 size-2 shrink-0 rounded-full" />
								)}
								<div className="min-w-0 flex-1">
									<span className="text-base-400 block truncate text-xs">{entry.name}</span>
									{entry.subtitle != null && (
										<span className="text-base-500 block truncate text-[11px] leading-tight">
											{entry.subtitle}
										</span>
									)}
								</div>
								<span className="text-base-500 shrink-0 text-xs">
									{formatDuration(entry.durationMs / 1000)}
								</span>
							</div>
						))}
					</div>
				)
			)}
		</div>
	);
};

interface TCategoryTooltipContentProps {
	block: TCategoryBlock;
	durationSec: number;
}

function getUsageEntriesSortedByDuration(activities: specta.WindowActivityDto[]): TUsageEntry[] {
	const map = new Map<string, TUsageEntry>();

	for (const activity of activities) {
		const websiteDomain = activity.websiteDomain?.trim();
		const hasWebsite = websiteDomain != null && websiteDomain.length > 0;
		const id = hasWebsite ? `website:${websiteDomain}` : `app:${activity.appBundleId ?? 'unknown'}`;
		const name = hasWebsite
			? (activity.websiteName ?? websiteDomain ?? 'Unknown website')
			: (activity.appName ?? 'Unknown');
		const icon = hasWebsite
			? (activity.websiteIcon ?? activity.appIcon ?? null)
			: (activity.appIcon ?? null);
		const subtitle = hasWebsite ? (activity.appName ?? null) : getActivitySubtitle(activity);
		const durationMs = activity.endedAt - activity.startedAt;
		const existing = map.get(id);

		if (existing != null) {
			existing.durationMs += durationMs;
			if (existing.subtitle == null && subtitle != null) {
				existing.subtitle = subtitle;
			}
			continue;
		}

		map.set(id, {
			id,
			name,
			icon,
			durationMs,
			subtitle
		});
	}

	return Array.from(map.values()).sort((a, b) => b.durationMs - a.durationMs);
}

interface TUsageEntry {
	id: string;
	name: string;
	icon: string | null;
	durationMs: number;
	subtitle: string | null;
}

function getCategoriesSortedByDuration(
	activities: specta.WindowActivityDto[]
): TCategoryDurationEntry[] {
	const map = new Map<TCategoryBlock['category'], number>();

	for (const activity of activities) {
		const category = getActivityCategory(activity);
		const durationMs = activity.endedAt - activity.startedAt;
		map.set(category, (map.get(category) ?? 0) + durationMs);
	}

	return Array.from(map.entries())
		.map(([category, durationMs]) => ({ category, durationMs }))
		.sort((a, b) => b.durationMs - a.durationMs);
}

interface TCategoryDurationEntry {
	category: TCategoryBlock['category'];
	durationMs: number;
}

function getVisibleActivities(block: TCategoryBlock): specta.WindowActivityDto[] {
	return block.activities.flatMap((activity) => {
		const startedAt = Math.max(activity.startedAt, block.startMs);
		const endedAt = Math.min(activity.endedAt, block.endMs);

		if (endedAt <= startedAt) {
			return [];
		}

		return [{ ...activity, startedAt, endedAt }];
	});
}

function getActivityCategory(activity: specta.WindowActivityDto): TCategoryBlock['category'] {
	const { category } = activity;
	return category === 'focused' || category === 'neutral' || category === 'distracting'
		? category
		: null;
}

function getActivitySubtitle(activity: specta.WindowActivityDto): string | null {
	return activity.windowTitle ?? activity.websiteName ?? activity.browserUrl ?? null;
}
