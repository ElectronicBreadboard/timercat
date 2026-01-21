import { specta } from '@/environment';
import type { TActivityBlock, TAppGroup, TWindow } from './types';

/**
 * Creates activity blocks with Google Maps-style progressive detail.
 *
 * Detail levels based on available pixel space:
 * - Zoomed in: Individual window blocks (when app is large enough AND all windows are visible)
 * - Medium: App blocks with window dividers
 * - Zoomed out: Clustered app blocks
 *
 * Key constraints:
 * - No block smaller than minBlockPx
 * - Only show individual windows if app group >= minAppWidthForWindowsPx
 */
export function createActivityBlocks(
	activities: specta.WindowActivityDto[],
	msToPx: (ms: number) => number,
	options: TCreateBlocksOptions
): TActivityBlock[] {
	const { minBlockPx, minAppWidthForWindowsPx, fallbackColor } = options;

	if (activities.length === 0) return [];

	const sorted = [...activities].sort((a, b) => a.startedAt - b.startedAt);

	// Step 1: Create windows with pixel measurements
	const windows = createWindows(sorted, msToPx);

	// Step 2: Group consecutive windows by app
	const appGroups = groupByApp(windows, fallbackColor);

	// Step 3: Process each app group based on available space
	const processedGroups = processAppGroups(appGroups, minBlockPx, minAppWidthForWindowsPx);

	// Step 4: Cluster tiny groups together
	const blocks = clusterTinyGroups(processedGroups, minBlockPx, fallbackColor);

	return blocks;
}

export interface TCreateBlocksOptions {
	minBlockPx: number;
	minAppWidthForWindowsPx: number;
	fallbackColor: string;
}

function createWindows(
	activities: specta.WindowActivityDto[],
	msToPx: (ms: number) => number
): TWindow[] {
	return activities.map((activity) => ({
		activity,
		leftPx: msToPx(activity.startedAt),
		widthPx: msToPx(activity.endedAt) - msToPx(activity.startedAt)
	}));
}

function groupByApp(windows: TWindow[], fallbackColor: string): TAppGroup[] {
	const groups: TAppGroup[] = [];
	let current: TAppGroup | null = null;

	for (const win of windows) {
		const bundleId = win.activity.appBundleId ?? 'unknown';

		if (current == null || current.bundleId !== bundleId) {
			if (current != null) groups.push(current);
			current = {
				bundleId,
				leftPx: win.leftPx,
				widthPx: win.widthPx,
				windows: [win],
				color: win.activity.appColor ?? fallbackColor,
				appName: win.activity.appName ?? 'Unknown',
				appIcon: win.activity.appIcon
			};
		} else {
			const rightPx = win.leftPx + win.widthPx;
			current.widthPx = rightPx - current.leftPx;
			current.windows.push(win);
		}
	}

	if (current != null) groups.push(current);
	return groups;
}

interface TProcessedGroup {
	appGroup: TAppGroup;
	detailLevel: 'windows' | 'app' | 'tiny';
}

function processAppGroups(
	appGroups: TAppGroup[],
	minBlockPx: number,
	minAppWidthForWindowsPx: number
): TProcessedGroup[] {
	return appGroups.map((appGroup) => {
		// Find smallest window in the group
		const smallestWindowPx = Math.min(...appGroup.windows.map((w) => w.widthPx));

		// Show individual windows only if:
		// 1. All windows are large enough (>= minBlockPx)
		// 2. The app group itself is substantial (>= minAppWidthForWindowsPx)
		if (smallestWindowPx >= minBlockPx && appGroup.widthPx >= minAppWidthForWindowsPx) {
			return { appGroup, detailLevel: 'windows' as const };
		}

		if (appGroup.widthPx >= minBlockPx) {
			// App group is large enough - show as app block with dividers
			return { appGroup, detailLevel: 'app' as const };
		}

		// Whole app group is tiny - needs clustering
		return { appGroup, detailLevel: 'tiny' as const };
	});
}

function clusterTinyGroups(
	processedGroups: TProcessedGroup[],
	minBlockPx: number,
	fallbackColor: string
): TActivityBlock[] {
	const blocks: TActivityBlock[] = [];
	let i = 0;

	while (i < processedGroups.length) {
		const { appGroup, detailLevel } = processedGroups[i]!;

		if (detailLevel === 'windows') {
			// Show individual windows
			for (let j = 0; j < appGroup.windows.length; j++) {
				const win = appGroup.windows[j]!;
				const isFirst = j === 0;
				const isLast = j === appGroup.windows.length - 1;
				blocks.push({
					leftPx: win.leftPx,
					widthPx: win.widthPx,
					color: appGroup.color,
					appName: appGroup.appName,
					appIcon: appGroup.appIcon,
					type: 'window',
					windowTitle: win.activity.windowTitle,
					windowCount: 1,
					appCount: 1,
					durationSec: (win.activity.endedAt - win.activity.startedAt) / 1000,
					isAppStart: isFirst,
					isAppEnd: isLast,
					dividers: []
				});
			}
			i++;
			continue;
		}

		if (detailLevel === 'app') {
			// Show as app block with window dividers
			blocks.push(createAppBlock(appGroup, minBlockPx));
			i++;
			continue;
		}

		// Tiny group - collect consecutive tiny groups for clustering
		const tinyRun: TAppGroup[] = [appGroup];
		let j = i + 1;
		while (j < processedGroups.length && processedGroups[j]!.detailLevel === 'tiny') {
			tinyRun.push(processedGroups[j]!.appGroup);
			j++;
		}

		if (tinyRun.length === 1) {
			// Single tiny app - show as minimal app block
			blocks.push(createAppBlock(appGroup, minBlockPx));
		} else {
			// Multiple tiny apps - cluster them
			blocks.push(createClusterBlock(tinyRun, fallbackColor));
		}

		i = j;
	}

	return blocks;
}

function createAppBlock(appGroup: TAppGroup, minBlockPx: number): TActivityBlock {
	// Calculate window dividers (at end of each window except last)
	const dividers: number[] = [];
	if (appGroup.windows.length > 1) {
		for (let i = 0; i < appGroup.windows.length - 1; i++) {
			const win = appGroup.windows[i]!;
			const dividerPx = win.leftPx + win.widthPx - appGroup.leftPx;
			// Only add divider if it's not too close to edges
			if (dividerPx > minBlockPx / 2 && dividerPx < appGroup.widthPx - minBlockPx / 2) {
				dividers.push(dividerPx);
			}
		}
	}

	const totalDurationSec = appGroup.windows.reduce(
		(sum, w) => sum + (w.activity.endedAt - w.activity.startedAt) / 1000,
		0
	);

	return {
		leftPx: appGroup.leftPx,
		widthPx: appGroup.widthPx,
		color: appGroup.color,
		appName: appGroup.appName,
		appIcon: appGroup.appIcon,
		type: 'app',
		windowTitle: null,
		windowCount: appGroup.windows.length,
		appCount: 1,
		durationSec: totalDurationSec,
		isAppStart: true,
		isAppEnd: true,
		dividers
	};
}

function createClusterBlock(appGroups: TAppGroup[], fallbackColor: string): TActivityBlock {
	const first = appGroups[0]!;
	const last = appGroups[appGroups.length - 1]!;

	// Find dominant app by total width
	const appWidths = new Map<string, { width: number; group: TAppGroup }>();
	for (const group of appGroups) {
		const existing = appWidths.get(group.bundleId);
		if (existing != null) {
			existing.width += group.widthPx;
		} else {
			appWidths.set(group.bundleId, { width: group.widthPx, group });
		}
	}
	const dominant = [...appWidths.values()].sort((a, b) => b.width - a.width)[0]!;

	const totalWidthPx = last.leftPx + last.widthPx - first.leftPx;
	const allWindows = appGroups.flatMap((g) => g.windows);
	const totalDurationSec = allWindows.reduce(
		(sum, w) => sum + (w.activity.endedAt - w.activity.startedAt) / 1000,
		0
	);

	return {
		leftPx: first.leftPx,
		widthPx: totalWidthPx,
		color: dominant.group.color ?? fallbackColor,
		appName: dominant.group.appName,
		appIcon: dominant.group.appIcon,
		type: 'cluster',
		windowTitle: null,
		windowCount: allWindows.length,
		appCount: appGroups.length,
		durationSec: totalDurationSec,
		isAppStart: true,
		isAppEnd: true,
		dividers: []
	};
}
