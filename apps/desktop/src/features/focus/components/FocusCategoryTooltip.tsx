import { formatDuration } from '@repo/ui';
import React from 'react';
import type { specta } from '@/environment';
import { categoryToColor, categoryToLabel, type FocusViewCategory } from '../focus-category';

export const FocusCategoryTooltip: React.FC<TFocusCategoryTooltipProps> = (props) => {
	const { category, durationMs, activities, categories = [] } = props;
	const isGrouped = categories.length > 1;
	const usageEntries = React.useMemo(
		() => (isGrouped ? [] : getUsageEntries(activities).slice(0, 3)),
		[isGrouped, activities]
	);

	return (
		<div className="flex w-40 flex-col gap-2">
			{/* Header */}
			<div className="flex items-center gap-2">
				<div
					className="size-2 shrink-0 rounded-full"
					style={{ backgroundColor: categoryToColor(category) }}
				/>
				<span className="text-sm font-medium">{categoryToLabel(category)}</span>
				<span className="text-base-500 text-xs">{formatDuration(durationMs / 1000)}</span>
			</div>

			{/* Info line */}
			<span className="text-base-400 text-xs">
				{isGrouped
					? `${categories.length} ${categories.length === 1 ? 'category' : 'categories'} · ${activities.length} ${activities.length === 1 ? 'activity' : 'activities'}`
					: `${activities.length} ${activities.length === 1 ? 'activity' : 'activities'}`}
			</span>

			{/* Category breakdown (grouped blocks) or top usage entries (single category) */}
			{isGrouped ? (
				<div className="border-base-200 flex flex-col gap-1 border-t pt-1.5">
					{categories.map(({ category: cat, durationMs: ms }) => (
						<div key={cat ?? 'uncategorized'} className="flex items-center gap-1.5">
							<div
								className="size-2 shrink-0 rounded-full"
								style={{ backgroundColor: categoryToColor(cat) }}
							/>
							<span className="text-base-400 min-w-0 flex-1 truncate text-xs">
								{categoryToLabel(cat)}
							</span>
							<span className="text-base-500 shrink-0 text-xs">{formatDuration(ms / 1000)}</span>
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

export interface TFocusCategoryTooltipProps {
	category: FocusViewCategory | null;
	durationMs: number;
	activities: specta.WindowActivityDto[];
	categories?: Array<{ category: FocusViewCategory | null; durationMs: number }>;
}

export function getUsageEntries(activities: specta.WindowActivityDto[]): TFocusUsageEntry[] {
	const map = new Map<string, TFocusUsageEntry>();

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
		const subtitle = hasWebsite
			? (activity.appName ?? null)
			: (activity.windowTitle ?? activity.websiteName ?? activity.browserUrl ?? null);
		const durationMs = activity.endedAt - activity.startedAt;
		const existing = map.get(id);

		if (existing != null) {
			existing.durationMs += durationMs;
			if (existing.subtitle == null && subtitle != null) {
				existing.subtitle = subtitle;
			}
			continue;
		}

		map.set(id, { id, name, icon, durationMs, subtitle });
	}

	return Array.from(map.values()).sort((a, b) => b.durationMs - a.durationMs);
}

export interface TFocusUsageEntry {
	id: string;
	name: string;
	icon: string | null;
	durationMs: number;
	subtitle: string | null;
}
