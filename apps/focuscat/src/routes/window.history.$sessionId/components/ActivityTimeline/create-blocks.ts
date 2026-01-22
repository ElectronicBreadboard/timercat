import type { specta } from '@/environment';

import type {
	TActivityBlock,
	TAppBlock,
	TAppInfo,
	TWindowBlock,
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

	// Step 5: Assign positions to same-app WindowBlock sequences
	const blocksWithPositions = assignWindowPositions(appLevelBlocks);

	// Clip to bounds
	return clipToBounds(blocksWithPositions, bounds.startMs, bounds.endMs);
}

// MARK: - Types for intermediate stages

interface TAppSegment {
	app: TAppInfo;
	windows: specta.WindowActivityDto[];
}

/** Item after window-level merge, before app-level merge */
interface TWindowLevelItem {
	startMs: number;
	endMs: number;
	app: TAppInfo;
	windows: specta.WindowActivityDto[];
}

// MARK: - Step 2: Group by app

function groupByApp(activities: specta.WindowActivityDto[]): TAppSegment[] {
	if (activities.length === 0) return [];

	const segments: TAppSegment[] = [];
	let current: TAppSegment = {
		app: extractAppInfo(activities[0]!),
		windows: [activities[0]!]
	};

	for (let i = 1; i < activities.length; i++) {
		const activity = activities[i]!;
		const bundleId = activity.appBundleId ?? 'unknown';

		if (bundleId === current.app.bundleId) {
			current.windows.push(activity);
		} else {
			segments.push(current);
			current = {
				app: extractAppInfo(activity),
				windows: [activity]
			};
		}
	}
	segments.push(current);

	return segments;
}

function extractAppInfo(activity: specta.WindowActivityDto): TAppInfo {
	return {
		bundleId: activity.appBundleId ?? 'unknown',
		name: activity.appName ?? 'Unknown',
		icon: activity.appIcon,
		color: activity.appColor
	};
}

// MARK: - Step 3: Window-level merge within segment

function mergeWindowsInSegment(
	segment: TAppSegment,
	msToPx: (ms: number) => number
): TWindowLevelItem[] {
	const { app, windows } = segment;
	const items: TWindowLevelItem[] = [];
	let mergeGroup: specta.WindowActivityDto[] = [];

	const flushMergeGroup = () => {
		if (mergeGroup.length === 0) return;

		items.push({
			startMs: mergeGroup[0]!.startedAt,
			endMs: mergeGroup[mergeGroup.length - 1]!.endedAt,
			app,
			windows: [...mergeGroup]
		});
		mergeGroup = [];
	};

	for (const window of windows) {
		const widthPx = msToPx(window.endedAt) - msToPx(window.startedAt);

		if (widthPx >= MIN_BLOCK_PX) {
			// Window is large enough on its own
			flushMergeGroup();
			items.push({
				startMs: window.startedAt,
				endMs: window.endedAt,
				app,
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

		const uniqueBundleIds = new Set(mergeGroup.map((item) => item.app.bundleId));

		if (uniqueBundleIds.size === 1) {
			// Same app - create WindowBlock
			blocks.push(createWindowBlock(mergeGroup));
		} else {
			// Different apps - create AppBlock
			blocks.push(createAppBlock(mergeGroup));
		}

		mergeGroup = [];
	};

	for (const item of items) {
		const widthPx = msToPx(item.endMs) - msToPx(item.startMs);

		if (widthPx >= MIN_BLOCK_PX) {
			// Item is large enough on its own
			flushMergeGroup();
			blocks.push(createWindowBlock([item]));
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
			const uniqueBundleIds = new Set(combinedItems.map((item) => item.app.bundleId));

			if (uniqueBundleIds.size === 1) {
				blocks.push(createWindowBlock(combinedItems));
			} else {
				blocks.push(createAppBlock(combinedItems));
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
					startMs: block.startMs,
					endMs: block.endMs,
					app: block.app,
					windows: block.windows
				}
			];
		case 'app':
			// For AppBlock, return each activity as a separate item
			return block.activities.map((activity) => ({
				startMs: activity.startedAt,
				endMs: activity.endedAt,
				app: extractAppInfo(activity),
				windows: [activity]
			}));
	}
}

// MARK: - Step 5: Assign window positions

function assignWindowPositions(blocks: TActivityBlock[]): TActivityBlock[] {
	// Group consecutive WindowBlocks by app for position assignment
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
			const bundleId = block.app.bundleId;

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

function createWindowBlock(items: TWindowLevelItem[]): TWindowBlock {
	const allWindows = items.flatMap((item) => item.windows);
	const firstItem = items[0]!;

	return {
		type: 'window',
		startMs: items[0]!.startMs,
		endMs: items[items.length - 1]!.endMs,
		app: firstItem.app,
		windows: allWindows,
		position: 'solo' // Will be updated in assignWindowPositions
	};
}

function createAppBlock(items: TWindowLevelItem[]): TAppBlock {
	const allActivities = items.flatMap((item) => item.windows);
	const apps = getUniqueApps(items);

	return {
		type: 'app',
		startMs: items[0]!.startMs,
		endMs: items[items.length - 1]!.endMs,
		apps,
		activities: allActivities
	};
}

// MARK: - Helpers

function getUniqueApps(items: TWindowLevelItem[]): TAppInfo[] {
	const seen = new Map<string, TAppInfo>();

	for (const item of items) {
		if (!seen.has(item.app.bundleId)) {
			seen.set(item.app.bundleId, item.app);
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
