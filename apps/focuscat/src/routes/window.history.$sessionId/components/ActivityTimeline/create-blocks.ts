import type { specta } from '@/environment';

import type {
	TActivityBlock,
	TAppMergedBlock,
	TWindowBlock,
	TWindowMergedBlock,
	TWindowPosition
} from './types';

const MIN_BLOCK_PX = 8;

export interface TCreateBlocksOptions {
	bounds: { startMs: number; endMs: number };
	msToPx: (ms: number) => number;
}

/**
 * Creates activity blocks with two-level merging:
 * 1. Window-level merge within same-app segments
 * 2. App-level merge across segments
 *
 * This preserves maximum detail - only merging what's necessary.
 */
export function createBlocks(
	activities: specta.WindowActivityDto[],
	options: TCreateBlocksOptions
): TActivityBlock[] {
	const { bounds, msToPx } = options;

	if (activities.length === 0) return [];

	// Step 1: Filter to visible and sort
	const visible = activities.filter(
		(a) => a.endedAt > bounds.startMs && a.startedAt < bounds.endMs
	);
	if (visible.length === 0) return [];

	const sorted = [...visible].sort((a, b) => a.startedAt - b.startedAt);

	// Step 2: Group consecutive same-app activities
	const appSegments = groupByApp(sorted);

	// Step 3: Window-level merge within each segment
	const windowLevelItems = appSegments.flatMap((segment) =>
		mergeWindowsInSegment(segment, msToPx)
	);

	// Step 4: App-level merge across segments
	const appLevelBlocks = mergeAcrossApps(windowLevelItems, msToPx);

	// Step 5: Assign window positions
	const blocksWithPositions = assignWindowPositions(appLevelBlocks);

	// Clip to bounds
	return clipToBounds(blocksWithPositions, bounds.startMs, bounds.endMs);
}

// MARK: - Types for intermediate stages

interface TAppSegment {
	bundleId: string;
	appName: string;
	appIcon: string | null;
	appColor: string | null;
	windows: specta.WindowActivityDto[];
}

/** Item after window-level merge, before app-level merge */
interface TWindowLevelItem {
	type: 'single' | 'merged';
	startMs: number;
	endMs: number;
	bundleId: string;
	appName: string;
	appIcon: string | null;
	appColor: string | null;
	windows: specta.WindowActivityDto[];
}

// MARK: - Step 2: Group by app

function groupByApp(activities: specta.WindowActivityDto[]): TAppSegment[] {
	if (activities.length === 0) return [];

	const segments: TAppSegment[] = [];
	let current: TAppSegment = {
		bundleId: activities[0]!.appBundleId ?? 'unknown',
		appName: activities[0]!.appName ?? 'Unknown',
		appIcon: activities[0]!.appIcon,
		appColor: activities[0]!.appColor,
		windows: [activities[0]!]
	};

	for (let i = 1; i < activities.length; i++) {
		const activity = activities[i]!;
		const bundleId = activity.appBundleId ?? 'unknown';

		if (bundleId === current.bundleId) {
			current.windows.push(activity);
		} else {
			segments.push(current);
			current = {
				bundleId,
				appName: activity.appName ?? 'Unknown',
				appIcon: activity.appIcon,
				appColor: activity.appColor,
				windows: [activity]
			};
		}
	}
	segments.push(current);

	return segments;
}

// MARK: - Step 3: Window-level merge within segment

function mergeWindowsInSegment(
	segment: TAppSegment,
	msToPx: (ms: number) => number
): TWindowLevelItem[] {
	const { bundleId, appName, appIcon, appColor, windows } = segment;
	const items: TWindowLevelItem[] = [];
	let mergeGroup: specta.WindowActivityDto[] = [];

	const flushMergeGroup = () => {
		if (mergeGroup.length === 0) return;

		if (mergeGroup.length === 1) {
			items.push({
				type: 'single',
				startMs: mergeGroup[0]!.startedAt,
				endMs: mergeGroup[0]!.endedAt,
				bundleId,
				appName,
				appIcon,
				appColor,
				windows: [mergeGroup[0]!]
			});
		} else {
			items.push({
				type: 'merged',
				startMs: mergeGroup[0]!.startedAt,
				endMs: mergeGroup[mergeGroup.length - 1]!.endedAt,
				bundleId,
				appName,
				appIcon,
				appColor,
				windows: [...mergeGroup]
			});
		}
		mergeGroup = [];
	};

	for (const window of windows) {
		const widthPx = msToPx(window.endedAt) - msToPx(window.startedAt);

		if (widthPx >= MIN_BLOCK_PX) {
			// Window is large enough on its own
			flushMergeGroup();
			items.push({
				type: 'single',
				startMs: window.startedAt,
				endMs: window.endedAt,
				bundleId,
				appName,
				appIcon,
				appColor,
				windows: [window]
			});
		} else {
			// Window is too small, add to merge group
			mergeGroup.push(window);

			// Check if merge group is now large enough
			const groupStartMs = mergeGroup[0]!.startedAt;
			const groupEndMs = window.endedAt;
			const groupWidthPx = msToPx(groupEndMs) - msToPx(groupStartMs);

			if (groupWidthPx >= MIN_BLOCK_PX) {
				flushMergeGroup();
			}
		}
	}

	// Handle remaining merge group
	if (mergeGroup.length > 0) {
		// Try to absorb into previous item if exists
		if (items.length > 0) {
			const lastItem = items[items.length - 1]!;
			lastItem.windows.push(...mergeGroup);
			lastItem.endMs = mergeGroup[mergeGroup.length - 1]!.endedAt;
			lastItem.type = 'merged';
		} else {
			flushMergeGroup();
		}
	}

	return items;
}

// MARK: - Step 4: App-level merge across segments

function mergeAcrossApps(
	items: TWindowLevelItem[],
	msToPx: (ms: number) => number
): TActivityBlock[] {
	if (items.length === 0) return [];

	const blocks: TActivityBlock[] = [];
	let mergeGroup: TWindowLevelItem[] = [];

	const getMergeGroupWidth = () => {
		if (mergeGroup.length === 0) return 0;
		const startMs = mergeGroup[0]!.startMs;
		const endMs = mergeGroup[mergeGroup.length - 1]!.endMs;
		return msToPx(endMs) - msToPx(startMs);
	};

	const flushMergeGroup = () => {
		if (mergeGroup.length === 0) return;

		const uniqueBundleIds = new Set(mergeGroup.map((item) => item.bundleId));

		if (uniqueBundleIds.size === 1) {
			// Same app - create Window or WindowMerged blocks
			const allWindows = mergeGroup.flatMap((item) => item.windows);
			if (allWindows.length === 1) {
				blocks.push(createWindowBlock(allWindows[0]!, 'solo'));
			} else {
				blocks.push(createWindowMergedBlock(mergeGroup));
			}
		} else {
			// Different apps - create AppMerged block
			blocks.push(createAppMergedBlock(mergeGroup));
		}

		mergeGroup = [];
	};

	for (const item of items) {
		const widthPx = msToPx(item.endMs) - msToPx(item.startMs);

		if (widthPx >= MIN_BLOCK_PX) {
			// Item is large enough on its own
			flushMergeGroup();

			// Add as appropriate block type
			if (item.type === 'single') {
				blocks.push(createWindowBlock(item.windows[0]!, 'solo'));
			} else {
				blocks.push(createWindowMergedBlock([item]));
			}
		} else {
			// Item is too small, add to merge group
			mergeGroup.push(item);

			// Check if merge group is now large enough
			if (getMergeGroupWidth() >= MIN_BLOCK_PX) {
				flushMergeGroup();
			}
		}
	}

	// Handle remaining merge group
	if (mergeGroup.length > 0) {
		// Try to absorb into previous block if exists
		if (blocks.length > 0) {
			const lastBlock = blocks.pop()!;
			const combinedItems = blockToItems(lastBlock).concat(mergeGroup);
			const uniqueBundleIds = new Set(combinedItems.map((item) => item.bundleId));

			if (uniqueBundleIds.size === 1) {
				const allWindows = combinedItems.flatMap((item) => item.windows);
				if (allWindows.length === 1) {
					blocks.push(createWindowBlock(allWindows[0]!, 'solo'));
				} else {
					blocks.push(createWindowMergedBlock(combinedItems));
				}
			} else {
				blocks.push(createAppMergedBlock(combinedItems));
			}
		} else {
			flushMergeGroup();
		}
	}

	return blocks;
}

/** Convert a block back to items for re-merging */
function blockToItems(block: TActivityBlock): TWindowLevelItem[] {
	switch (block.type) {
		case 'window':
			return [
				{
					type: 'single',
					startMs: block.startMs,
					endMs: block.endMs,
					bundleId: block.activity.appBundleId ?? 'unknown',
					appName: block.activity.appName ?? 'Unknown',
					appIcon: block.activity.appIcon,
					appColor: block.activity.appColor,
					windows: [block.activity]
				}
			];
		case 'window-merged':
			return [
				{
					type: 'merged',
					startMs: block.startMs,
					endMs: block.endMs,
					bundleId: block.bundleId,
					appName: block.appName,
					appIcon: block.appIcon,
					appColor: block.appColor,
					windows: block.windows
				}
			];
		case 'app-merged':
			// For AppMerged, return each activity as a separate item
			return block.activities.map((activity) => ({
				type: 'single' as const,
				startMs: activity.startedAt,
				endMs: activity.endedAt,
				bundleId: activity.appBundleId ?? 'unknown',
				appName: activity.appName ?? 'Unknown',
				appIcon: activity.appIcon,
				appColor: activity.appColor,
				windows: [activity]
			}));
	}
}

// MARK: - Step 5: Assign window positions

function assignWindowPositions(blocks: TActivityBlock[]): TActivityBlock[] {
	// Group consecutive Window blocks by app for position assignment
	const result: TActivityBlock[] = [];
	let windowSequence: TWindowBlock[] = [];
	let currentBundleId: string | null = null;

	const flushWindowSequence = () => {
		if (windowSequence.length === 0) return;

		if (windowSequence.length === 1) {
			windowSequence[0]!.position = 'solo';
		} else {
			windowSequence[0]!.position = 'start';
			for (let i = 1; i < windowSequence.length - 1; i++) {
				windowSequence[i]!.position = 'center';
			}
			windowSequence[windowSequence.length - 1]!.position = 'end';
		}

		result.push(...windowSequence);
		windowSequence = [];
		currentBundleId = null;
	};

	for (const block of blocks) {
		if (block.type === 'window') {
			const bundleId = block.activity.appBundleId ?? 'unknown';

			if (currentBundleId === null || bundleId === currentBundleId) {
				windowSequence.push(block);
				currentBundleId = bundleId;
			} else {
				flushWindowSequence();
				windowSequence.push(block);
				currentBundleId = bundleId;
			}
		} else {
			flushWindowSequence();
			result.push(block);
		}
	}

	flushWindowSequence();
	return result;
}

// MARK: - Block creators

function createWindowBlock(
	activity: specta.WindowActivityDto,
	position: TWindowPosition
): TWindowBlock {
	return {
		type: 'window',
		startMs: activity.startedAt,
		endMs: activity.endedAt,
		activity,
		position
	};
}

function createWindowMergedBlock(items: TWindowLevelItem[]): TWindowMergedBlock {
	const allWindows = items.flatMap((item) => item.windows);
	const firstItem = items[0]!;

	return {
		type: 'window-merged',
		startMs: items[0]!.startMs,
		endMs: items[items.length - 1]!.endMs,
		bundleId: firstItem.bundleId,
		appName: firstItem.appName,
		appIcon: firstItem.appIcon,
		appColor: firstItem.appColor,
		windows: allWindows
	};
}

function createAppMergedBlock(items: TWindowLevelItem[]): TAppMergedBlock {
	const allActivities = items.flatMap((item) => item.windows);
	const dominant = getDominantApp(allActivities);
	const uniqueApps = getUniqueApps(allActivities);

	return {
		type: 'app-merged',
		startMs: items[0]!.startMs,
		endMs: items[items.length - 1]!.endMs,
		dominantApp: dominant,
		activities: allActivities,
		uniqueApps
	};
}

// MARK: - Helpers

function getDominantApp(activities: specta.WindowActivityDto[]): {
	bundleId: string;
	appName: string;
	appIcon: string | null;
	appColor: string | null;
} {
	const appDurations = new Map<
		string,
		{ duration: number; activity: specta.WindowActivityDto }
	>();

	for (const activity of activities) {
		const bundleId = activity.appBundleId ?? 'unknown';
		const duration = activity.endedAt - activity.startedAt;
		const existing = appDurations.get(bundleId);

		if (existing) {
			existing.duration += duration;
		} else {
			appDurations.set(bundleId, { duration, activity });
		}
	}

	let dominant = { bundleId: 'unknown', duration: 0, activity: activities[0]! };
	for (const [bundleId, data] of appDurations) {
		if (data.duration > dominant.duration) {
			dominant = { bundleId, ...data };
		}
	}

	return {
		bundleId: dominant.bundleId,
		appName: dominant.activity.appName ?? 'Unknown',
		appIcon: dominant.activity.appIcon,
		appColor: dominant.activity.appColor
	};
}

function getUniqueApps(
	activities: specta.WindowActivityDto[]
): Array<{ bundleId: string; appName: string; appIcon: string | null }> {
	const seen = new Map<
		string,
		{ bundleId: string; appName: string; appIcon: string | null }
	>();

	for (const activity of activities) {
		const bundleId = activity.appBundleId ?? 'unknown';
		if (!seen.has(bundleId)) {
			seen.set(bundleId, {
				bundleId,
				appName: activity.appName ?? 'Unknown',
				appIcon: activity.appIcon
			});
		}
	}

	return Array.from(seen.values());
}

function clipToBounds(
	blocks: TActivityBlock[],
	startMs: number,
	endMs: number
): TActivityBlock[] {
	if (blocks.length === 0) return blocks;

	return blocks.map((block, i) => {
		const clippedStart = i === 0 ? Math.max(block.startMs, startMs) : block.startMs;
		const clippedEnd =
			i === blocks.length - 1 ? Math.min(block.endMs, endMs) : block.endMs;

		if (clippedStart === block.startMs && clippedEnd === block.endMs) {
			return block;
		}

		return { ...block, startMs: clippedStart, endMs: clippedEnd };
	});
}
