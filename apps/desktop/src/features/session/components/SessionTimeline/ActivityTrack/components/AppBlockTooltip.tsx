import { formatDuration } from '@repo/ui';
import React from 'react';
import type { specta } from '@/environment';
import type { TAppBlock } from '../types';

export const AppBlockTooltip: React.FC<TAppBlockTooltipProps> = (props) => {
	const { block, durationSec } = props;
	const appEntries = React.useMemo(
		() => getAppEntriesSortedByDuration(block.activities),
		[block.activities]
	);
	const visibleAppEntries = appEntries.slice(0, 3);
	const hiddenAppCount = Math.max(appEntries.length - visibleAppEntries.length, 0);
	const dominantApp = appEntries[0];

	if (dominantApp == null) {
		return null;
	}

	return (
		<div className="flex w-40 flex-col gap-2">
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
				<div className="border-base-200 flex flex-col gap-1 border-t pt-1.5">
					{visibleAppEntries.map((app) => (
						<div key={app.bundleId} className="flex items-center gap-1.5">
							{app.icon != null ? (
								<img src={app.icon} alt="" className="size-4 shrink-0 rounded" />
							) : (
								<div className="bg-base-300 size-2 shrink-0 rounded-full" />
							)}
							<span className="text-base-400 min-w-0 flex-1 truncate text-xs">{app.name}</span>
							<span className="text-base-500 shrink-0 text-xs">
								{formatDuration(app.durationMs / 1000)}
							</span>
						</div>
					))}
					{hiddenAppCount > 0 && (
						<span className="text-base-500 pt-0.5 text-xs">+{hiddenAppCount} more apps</span>
					)}
				</div>
			)}
		</div>
	);
};

export interface TAppBlockTooltipProps {
	block: TAppBlock;
	durationSec: number;
}

function getAppEntriesSortedByDuration(activities: specta.WindowActivityDto[]): TAppEntry[] {
	const map = new Map<string, TAppEntry>();

	for (const activity of activities) {
		const bundleId = activity.appBundleId ?? 'unknown';
		const durationMs = activity.endedAt - activity.startedAt;
		const existing = map.get(bundleId);

		if (existing != null) {
			existing.durationMs += durationMs;
			continue;
		}

		map.set(bundleId, {
			bundleId,
			name: activity.appName ?? 'Unknown',
			icon: activity.appIcon ?? null,
			durationMs
		});
	}

	return Array.from(map.values()).sort((a, b) => b.durationMs - a.durationMs);
}

interface TAppEntry {
	bundleId: string;
	name: string;
	icon: string | null;
	durationMs: number;
}
