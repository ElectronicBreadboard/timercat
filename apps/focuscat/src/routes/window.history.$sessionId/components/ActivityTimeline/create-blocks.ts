import type { specta } from '@/environment';

import {
	DEFAULT_BLOCK_CONFIG,
	type TActivityBlock,
	type TAppBlock,
	type TBlockConfig,
	type TWindowBlock
} from './types';

export interface TCreateBlocksOptions {
	config?: TBlockConfig;
	bounds?: { startMs: number; endMs: number };
}

/**
 * Creates activity blocks with density-based aggregation.
 *
 * Approach:
 * 1. At low density (zoomed in): show individual window blocks
 * 2. At high density (zoomed out): show dominant app for each time region
 *
 * The "dominant app" approach groups by which app has the most duration
 * in each time region, creating a visual representation that matches
 * the color distribution you see when fully zoomed in.
 */
export function createBlocks(
	activities: specta.WindowActivityDto[],
	msToPx: (ms: number) => number,
	options: TCreateBlocksOptions = {}
): TActivityBlock[] {
	const { config = DEFAULT_BLOCK_CONFIG, bounds } = options;

	if (activities.length === 0) return [];
	if (bounds == null) {
		// Need bounds to calculate buckets
		return createWindowBlocks(activities);
	}

	const totalPixelWidth = msToPx(bounds.endMs) - msToPx(bounds.startMs);
	const totalDurationMs = bounds.endMs - bounds.startMs;

	// Calculate overall density
	const overallDensity = activities.length / Math.max(totalPixelWidth, 1);

	// If low density, show individual windows
	if (overallDensity <= config.windowToAppThreshold) {
		return clampBlocksToBounds(createWindowBlocks(activities), bounds.startMs, bounds.endMs);
	}

	// High density: use time-bucket dominance approach
	const blocks = createDominanceBlocks(
		activities,
		bounds.startMs,
		bounds.endMs,
		totalPixelWidth,
		config
	);

	return clampBlocksToBounds(blocks, bounds.startMs, bounds.endMs);
}

/**
 * Creates window blocks from activities (no grouping).
 */
function createWindowBlocks(activities: specta.WindowActivityDto[]): TWindowBlock[] {
	const sorted = [...activities].sort((a, b) => a.startedAt - b.startedAt);

	return sorted.map((activity, index) => {
		const prevActivity = sorted[index - 1];
		const nextActivity = sorted[index + 1];

		const bundleId = activity.appBundleId ?? 'unknown';
		const prevBundleId = prevActivity?.appBundleId ?? null;
		const nextBundleId = nextActivity?.appBundleId ?? null;

		return {
			type: 'window',
			activity,
			startMs: activity.startedAt,
			endMs: activity.endedAt,
			isAppStart: bundleId !== prevBundleId,
			isAppEnd: bundleId !== nextBundleId
		};
	});
}

/**
 * Creates blocks based on dominant app in each time region.
 * Divides timeline into buckets, finds dominant app per bucket,
 * then merges consecutive buckets with same dominant app.
 */
function createDominanceBlocks(
	activities: specta.WindowActivityDto[],
	startMs: number,
	endMs: number,
	totalPixelWidth: number,
	config: TBlockConfig
): TActivityBlock[] {
	// Target ~10-20 pixels per bucket for smooth grouping
	const targetBucketPixels = 15;
	const bucketCount = Math.max(1, Math.round(totalPixelWidth / targetBucketPixels));
	const bucketDurationMs = (endMs - startMs) / bucketCount;

	// Create buckets and find dominant app for each
	const buckets: TBucket[] = [];

	for (let i = 0; i < bucketCount; i++) {
		const bucketStart = startMs + i * bucketDurationMs;
		const bucketEnd = startMs + (i + 1) * bucketDurationMs;

		const dominant = findDominantApp(activities, bucketStart, bucketEnd);
		buckets.push({
			startMs: bucketStart,
			endMs: bucketEnd,
			dominant
		});
	}

	// Merge consecutive buckets with same dominant app
	const merged = mergeBuckets(buckets);

	// Convert to app blocks
	return merged.map((region) => createAppBlockFromRegion(region, activities));
}

interface TBucket {
	startMs: number;
	endMs: number;
	dominant: TDominantApp | null;
}

interface TDominantApp {
	bundleId: string;
	appName: string;
	appIcon: string | null;
	appColor: string | null;
	durationMs: number;
}

/**
 * Finds the dominant app (by duration) in a time range.
 */
function findDominantApp(
	activities: specta.WindowActivityDto[],
	rangeStart: number,
	rangeEnd: number
): TDominantApp | null {
	const appDurations = new Map<
		string,
		{ durationMs: number; appName: string; appIcon: string | null; appColor: string | null }
	>();

	for (const activity of activities) {
		// Check if activity overlaps with range
		if (activity.endedAt <= rangeStart || activity.startedAt >= rangeEnd) {
			continue;
		}

		// Calculate overlap duration
		const overlapStart = Math.max(activity.startedAt, rangeStart);
		const overlapEnd = Math.min(activity.endedAt, rangeEnd);
		const overlapDuration = overlapEnd - overlapStart;

		if (overlapDuration <= 0) continue;

		const bundleId = activity.appBundleId ?? 'unknown';
		const existing = appDurations.get(bundleId);

		if (existing != null) {
			existing.durationMs += overlapDuration;
		} else {
			appDurations.set(bundleId, {
				durationMs: overlapDuration,
				appName: activity.appName ?? 'Unknown',
				appIcon: activity.appIcon,
				appColor: activity.appColor
			});
		}
	}

	// Find app with most duration
	let dominant: TDominantApp | null = null;

	for (const [bundleId, data] of appDurations) {
		if (dominant == null || data.durationMs > dominant.durationMs) {
			dominant = {
				bundleId,
				appName: data.appName,
				appIcon: data.appIcon,
				appColor: data.appColor,
				durationMs: data.durationMs
			};
		}
	}

	return dominant;
}

/**
 * Merges consecutive buckets that have the same dominant app.
 */
function mergeBuckets(
	buckets: TBucket[]
): Array<{ startMs: number; endMs: number; dominant: TDominantApp | null }> {
	if (buckets.length === 0) return [];

	const merged: Array<{ startMs: number; endMs: number; dominant: TDominantApp | null }> = [];
	let current = { ...buckets[0]! };

	for (let i = 1; i < buckets.length; i++) {
		const bucket = buckets[i]!;

		// Same dominant app? Merge
		if (current.dominant?.bundleId === bucket.dominant?.bundleId) {
			current.endMs = bucket.endMs;
			// Accumulate duration
			if (current.dominant != null && bucket.dominant != null) {
				current.dominant.durationMs += bucket.dominant.durationMs;
			}
		} else {
			// Different app, start new region
			merged.push(current);
			current = { ...bucket };
		}
	}

	merged.push(current);
	return merged;
}

/**
 * Creates an app block from a merged region.
 */
function createAppBlockFromRegion(
	region: { startMs: number; endMs: number; dominant: TDominantApp | null },
	activities: specta.WindowActivityDto[]
): TAppBlock {
	// Find all activities that overlap with this region
	const regionActivities = activities.filter(
		(a) => a.endedAt > region.startMs && a.startedAt < region.endMs
	);

	const dominant = region.dominant ?? {
		bundleId: 'unknown',
		appName: 'Unknown',
		appIcon: null,
		appColor: null
	};

	return {
		type: 'app',
		bundleId: dominant.bundleId,
		appName: dominant.appName,
		appIcon: dominant.appIcon,
		appColor: dominant.appColor,
		startMs: region.startMs,
		endMs: region.endMs,
		windowCount: regionActivities.length,
		windows: regionActivities
	};
}

/**
 * Filter blocks to only those within a time range.
 */
export function filterBlocksInRange<T extends { startMs: number; endMs: number }>(
	blocks: T[],
	rangeStartMs: number,
	rangeEndMs: number
): T[] {
	return blocks.filter((block) => block.endMs > rangeStartMs && block.startMs < rangeEndMs);
}

/**
 * Clamp blocks to session boundaries.
 */
function clampBlocksToBounds(
	blocks: TActivityBlock[],
	boundsStartMs: number,
	boundsEndMs: number
): TActivityBlock[] {
	const result: TActivityBlock[] = [];

	for (const block of blocks) {
		if (block.endMs <= boundsStartMs || block.startMs >= boundsEndMs) {
			continue;
		}

		result.push({
			...block,
			startMs: Math.max(block.startMs, boundsStartMs),
			endMs: Math.min(block.endMs, boundsEndMs)
		});
	}

	return result;
}
