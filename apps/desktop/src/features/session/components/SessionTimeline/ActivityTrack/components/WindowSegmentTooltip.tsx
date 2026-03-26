import { formatDuration } from '@repo/ui';
import React from 'react';
import type { specta } from '@/environment';
import type { TAppInfo, TWindowSegment } from '../types';

export const WindowSegmentTooltip: React.FC<TWindowSegmentTooltipProps> = (props) => {
	const { segment, app, durationSec } = props;
	const { windows } = segment;
	const firstWindow = windows[0];
	const windowEntries = React.useMemo(() => getWindowEntriesSortedByDuration(windows), [windows]);
	const visibleWindowEntries = windowEntries.slice(0, 3);
	const hiddenWindowCount = Math.max(windowEntries.length - visibleWindowEntries.length, 0);

	const subtitle = React.useMemo(() => {
		if (windows.length === 1 && firstWindow?.windowTitle != null) {
			return firstWindow.windowTitle;
		}
		if (windows.length > 1) {
			return `${windows.length} windows`;
		}
		return null;
	}, [windows, firstWindow]);

	return (
		<div className="flex w-40 flex-col gap-2">
			<div className="flex items-center gap-2.5">
				{app.icon != null && <img src={app.icon} alt="" className="size-8 shrink-0 rounded" />}
				<div className="flex min-w-0 flex-col gap-0.5">
					<span className="truncate text-sm font-medium">{app.name}</span>
					{subtitle != null && <span className="text-base-400 truncate text-xs">{subtitle}</span>}
					<span className="text-base-500 text-xs">{formatDuration(durationSec)}</span>
				</div>
			</div>

			{windows.length > 1 && visibleWindowEntries.length > 0 && (
				<div className="border-base-200 flex flex-col gap-1 border-t pt-1.5">
					{visibleWindowEntries.map((entry) => (
						<div key={entry.id} className="flex items-center gap-1.5">
							<div className="bg-base-300 size-2 shrink-0 rounded-full" />
							<span className="text-base-400 min-w-0 flex-1 truncate text-xs">{entry.label}</span>
							<span className="text-base-500 shrink-0 text-xs">
								{formatDuration(entry.durationMs / 1000)}
							</span>
						</div>
					))}
					{hiddenWindowCount > 0 && (
						<span className="text-base-500 pt-0.5 text-xs">+{hiddenWindowCount} more windows</span>
					)}
				</div>
			)}
		</div>
	);
};

export interface TWindowSegmentTooltipProps {
	segment: TWindowSegment;
	app: TAppInfo;
	durationSec: number;
}

function getWindowEntriesSortedByDuration(windows: specta.WindowActivityDto[]): TWindowEntry[] {
	const map = new Map<string, TWindowEntry>();

	for (const window of windows) {
		const rawLabel = getWindowLabel(window);
		const durationMs = window.endedAt - window.startedAt;
		const existing = map.get(rawLabel);

		if (existing != null) {
			existing.durationMs += durationMs;
			continue;
		}

		map.set(rawLabel, { id: rawLabel, label: rawLabel, durationMs });
	}

	return Array.from(map.values()).sort((a, b) => b.durationMs - a.durationMs);
}

interface TWindowEntry {
	id: string;
	label: string;
	durationMs: number;
}

function getWindowLabel(window: specta.WindowActivityDto): string {
	const title = window.windowTitle?.trim();
	if (title != null && title.length > 0) return title;

	const websiteName = window.websiteName?.trim();
	if (websiteName != null && websiteName.length > 0) return websiteName;

	const websiteDomain = window.websiteDomain?.trim();
	if (websiteDomain != null && websiteDomain.length > 0) return websiteDomain;

	const browserUrl = window.browserUrl?.trim();
	if (browserUrl != null && browserUrl.length > 0) return browserUrl;

	return 'Untitled window';
}

