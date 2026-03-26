import { createState } from 'feature-state';
import type { TimelineCx } from '@/components';
import type { specta } from '@/environment';
import type { FocusViewCategory, TViewMode } from '../focus-category';
import {
	groupConsecutiveByKey,
	mergeAdjacentBlocksByKey,
	mergeTinyGroupsWithNeighbors,
	mergeTinyRunsByKey
} from './lib';
import type {
	TActivityBlock,
	TAppBlock,
	TAppInfo,
	TCategoryBlock,
	TWindowBlock,
	TWindowGroupBlock
} from './types';

export class ActivityTrackCx {
	public readonly timelineCx: TimelineCx;
	public readonly $blocks = createState<TActivityBlock[]>([]);

	private _thresholds: TActivityTrackCxThresholds;
	private _activities: specta.WindowActivityDto[];
	private _viewMode: TViewMode = 'apps';
	private _lastResolution: number = -1;
	private _unlisteners: Array<() => void> = [];

	constructor(
		timelineCx: TimelineCx,
		activities: specta.WindowActivityDto[],
		options: TActivityTrackCxOptions = {}
	) {
		const { minSegmentPx = 8, minGroupPx = 12 } = options;
		this.timelineCx = timelineCx;
		this._activities = activities;
		this._thresholds = { minSegmentPx, minGroupPx };

		this.updateBlocks();
		this._unlisteners.push(
			timelineCx.$zoom.listen(() => this.updateBlocks()),
			timelineCx.$containerRect.listen(() => this.updateBlocks())
		);
	}

	public get thresholds(): TActivityTrackCxThresholds {
		return this._thresholds;
	}

	public unmount(): void {
		for (const unlisten of this._unlisteners) {
			unlisten();
		}
		this._unlisteners = [];
	}

	public setActivities(activities: specta.WindowActivityDto[]): void {
		this._activities = activities;
		this._lastResolution = -1;
		this.updateBlocks();
	}

	public setConfig(config: Partial<TActivityTrackCxThresholds>): void {
		this._thresholds = { ...this._thresholds, ...config };
		this._lastResolution = -1;
		this.updateBlocks();
	}

	public setViewMode(mode: TViewMode): void {
		this._viewMode = mode;
		this._lastResolution = -1;
		this.updateBlocks();
	}

	private updateBlocks(): void {
		const resolution = this.timelineCx.getMarkerResolution();
		if (resolution === this._lastResolution) {
			return;
		}
		this._lastResolution = resolution;
		this.$blocks.set(this.createBlocks());
	}

	private createBlocks(): TActivityBlock[] {
		if (this._viewMode === 'focus') {
			return this.createCategoryBlocks();
		}
		return this.createAppWebsiteBlocks();
	}

	// MARK: - App / website pipeline (apps view mode)

	/**
	 * Creates app/website blocks via the shared aggregation pipeline.
	 * Like map zoom levels: less detail when zoomed out, more when zoomed in.
	 *
	 * Pipeline:
	 * 1. Build window-level units for visible activities
	 * 2. Merge tiny same-app runs so they remain visible
	 * 3. Group consecutive same-app runs into WindowGroups
	 * 4. Merge tiny groups with the smaller neighbor into AppBlocks
	 * 5. Merge adjacent AppBlocks that share the same dominant app
	 * 6. Clip edge blocks to visible timeline bounds
	 */
	private createAppWebsiteBlocks(): TActivityBlock[] {
		const { startMs, endMs } = this.timelineCx;
		const visibleActivities = this.getVisibleActivities(startMs, endMs);
		if (!visibleActivities.length) {
			return [];
		}

		const windowBlocks = visibleActivities.map((activity) => this.activityToWindowBlock(activity));
		const mergedWindows = mergeTinyRunsByKey(windowBlocks, {
			minWidthPx: this._thresholds.minSegmentPx,
			getKey: (block) => block.app.bundleId,
			msToPx: (ms) => this.msToPx(ms),
			mergeBlocks: (blocks) => this.mergeWindowBlocks(blocks)
		});
		const windowGroups = groupConsecutiveByKey(mergedWindows, {
			getKey: (block) => block.app.bundleId,
			mergeGroup: (blocks) => this.windowBlocksToGroup(blocks)
		});
		const mergedGroups = mergeTinyGroupsWithNeighbors<TWindowGroupBlock, TAppBlock>(windowGroups, {
			minWidthPx: this._thresholds.minGroupPx,
			getWidthPx: (block) => this.getBlockWidthPx(block),
			mergeBlocks: (blocks) => this.mergeBlocksIntoAppBlock(blocks)
		});
		const mergedBlocks = mergeAdjacentBlocksByKey<TActivityBlock, string>(mergedGroups, {
			getMergeKey: (block) => (block.type === 'app' ? block.apps[0]?.bundleId : undefined),
			mergeBlocks: (blocks) => this.mergeBlocksIntoAppBlock(blocks)
		});

		return this.clipBlocksToBounds(mergedBlocks, startMs, endMs);
	}

	/**
	 * Clips first/last blocks to timeline bounds.
	 * Activities may extend beyond visible range - this ensures clean edges.
	 */
	private clipBlocksToBounds(
		blocks: TActivityBlock[],
		boundsStartMs: number,
		boundsEndMs: number
	): TActivityBlock[] {
		return blocks.map((block, i) => {
			const isFirst = i === 0;
			const isLast = i === blocks.length - 1;

			const clippedStart = isFirst ? Math.max(block.startMs, boundsStartMs) : block.startMs;
			const clippedEnd = isLast ? Math.min(block.endMs, boundsEndMs) : block.endMs;

			const needsClipping = clippedStart !== block.startMs || clippedEnd !== block.endMs;
			if (!needsClipping) {
				return block;
			}

			if (block.type === 'window-group') {
				return this.clipWindowGroup(block, clippedStart, clippedEnd);
			}

			return { ...block, startMs: clippedStart, endMs: clippedEnd };
		});
	}

	/** Clips a WindowGroupBlock and its segments to new bounds. */
	private clipWindowGroup(
		group: TWindowGroupBlock,
		clippedStart: number,
		clippedEnd: number
	): TWindowGroupBlock {
		const clippedSegments = group.segments.map((segment, j) => {
			const isFirstSegment = j === 0;
			const isLastSegment = j === group.segments.length - 1;

			const segmentStart = isFirstSegment
				? Math.max(segment.startMs, clippedStart)
				: segment.startMs;
			const segmentEnd = isLastSegment ? Math.min(segment.endMs, clippedEnd) : segment.endMs;

			if (segmentStart === segment.startMs && segmentEnd === segment.endMs) {
				return segment;
			}

			return { ...segment, startMs: segmentStart, endMs: segmentEnd };
		});

		return { ...group, startMs: clippedStart, endMs: clippedEnd, segments: clippedSegments };
	}

	/** Converts a single activity to a WindowBlock. */
	private activityToWindowBlock(activity: specta.WindowActivityDto): TWindowBlock {
		return {
			type: 'window',
			startMs: activity.startedAt,
			endMs: activity.endedAt,
			app: this.extractAppInfo(activity),
			windows: [activity]
		};
	}

	/** Merges multiple WindowBlocks into a single WindowBlock (same app assumed). */
	private mergeWindowBlocks(blocks: TWindowBlock[]): TWindowBlock {
		const first = blocks[0];
		const last = blocks[blocks.length - 1];

		if (first == null || last == null) {
			throw new Error('Cannot merge empty block array');
		}

		return {
			type: 'window',
			startMs: first.startMs,
			endMs: last.endMs,
			app: first.app,
			windows: blocks.flatMap((b) => b.windows)
		};
	}

	/** Converts WindowBlocks to a WindowGroupBlock with segments. */
	private windowBlocksToGroup(blocks: TWindowBlock[]): TWindowGroupBlock {
		const first = blocks[0];
		const last = blocks[blocks.length - 1];

		if (first == null || last == null) {
			throw new Error('Cannot create group from empty block array');
		}

		return {
			type: 'window-group',
			startMs: first.startMs,
			endMs: last.endMs,
			app: first.app,
			segments: blocks.map((block) => ({
				startMs: block.startMs,
				endMs: block.endMs,
				windows: block.windows
			}))
		};
	}

	/** Merges multiple blocks (any type) into an AppBlock. */
	private mergeBlocksIntoAppBlock(blocks: TActivityBlock[]): TAppBlock {
		const first = blocks[0];
		const last = blocks[blocks.length - 1];

		if (first == null || last == null) {
			throw new Error('Cannot merge empty block array');
		}

		const allActivities = blocks.flatMap((block) => this.getActivitiesFromBlock(block));

		return {
			type: 'app',
			startMs: first.startMs,
			endMs: last.endMs,
			apps: this.getAppsSortedByDuration(allActivities),
			activities: allActivities
		};
	}

	/** Extracts app metadata from an activity. */
	private extractAppInfo(activity: specta.WindowActivityDto): TAppInfo {
		return {
			bundleId: activity.appBundleId ?? 'unknown',
			name: activity.appName ?? 'Unknown',
			icon: activity.appIcon,
			color: activity.appColor
		};
	}

	/** Gets unique apps sorted by total duration (dominant app first). */
	private getAppsSortedByDuration(activities: specta.WindowActivityDto[]): TAppInfo[] {
		const durationByApp = new Map<string, { app: TAppInfo; durationMs: number }>();

		for (const activity of activities) {
			const bundleId = activity.appBundleId ?? 'unknown';
			const duration = activity.endedAt - activity.startedAt;
			const existing = durationByApp.get(bundleId);

			if (existing != null) {
				existing.durationMs += duration;
			} else {
				durationByApp.set(bundleId, {
					app: this.extractAppInfo(activity),
					durationMs: duration
				});
			}
		}

		return Array.from(durationByApp.values())
			.sort((a, b) => b.durationMs - a.durationMs)
			.map((entry) => entry.app);
	}

	// MARK: - Category pipeline (focus view mode)

	/**
	 * Creates category blocks for focus view mode via the shared aggregation pipeline.
	 *
	 * Pipeline:
	 * 1. Build category-level units for visible activities
	 * 2. Merge tiny same-category runs so they remain visible
	 * 3. Group consecutive same-category runs
	 * 4. Merge tiny groups with the smaller neighbor
	 * 5. Merge adjacent blocks that share the same dominant category
	 * 6. Clip edge blocks to visible timeline bounds
	 */
	private createCategoryBlocks(): TCategoryBlock[] {
		const { startMs, endMs } = this.timelineCx;
		const visibleActivities = this.getVisibleActivities(startMs, endMs);
		if (!visibleActivities.length) {
			return [];
		}

		const categoryBlocks = visibleActivities.map((activity) =>
			this.activityToCategoryUnit(activity)
		);
		const mergedActivities = mergeTinyRunsByKey(categoryBlocks, {
			minWidthPx: this._thresholds.minSegmentPx,
			getKey: (block) => block.category,
			msToPx: (ms) => this.msToPx(ms),
			mergeBlocks: (blocks) => this.mergeCategoryBlocks(blocks)
		});
		const categoryGroups = groupConsecutiveByKey(mergedActivities, {
			getKey: (block) => block.category,
			mergeGroup: (blocks) => this.mergeCategoryBlocks(blocks)
		});
		const mergedGroups = mergeTinyGroupsWithNeighbors<TCategoryBlock, TCategoryBlock>(
			categoryGroups,
			{
				minWidthPx: this._thresholds.minGroupPx,
				getWidthPx: (block) => this.getBlockWidthPx(block),
				mergeBlocks: (blocks) => this.mergeCategoryBlocks(blocks)
			}
		);
		const mergedBlocks = mergeAdjacentBlocksByKey<TCategoryBlock, FocusViewCategory | null>(
			mergedGroups,
			{
				getMergeKey: (block) => block.category,
				mergeBlocks: (blocks) => this.mergeCategoryBlocks(blocks)
			}
		);

		return this.clipBlocksToBounds(mergedBlocks, startMs, endMs) as TCategoryBlock[];
	}

	/** Converts a single activity to a category unit block. */
	private activityToCategoryUnit(activity: specta.WindowActivityDto): TCategoryBlock {
		return {
			type: 'category',
			startMs: activity.startedAt,
			endMs: activity.endedAt,
			category: this.extractCategory(activity),
			categories: [
				{
					category: this.extractCategory(activity),
					durationMs: activity.endedAt - activity.startedAt
				}
			],
			activities: [activity]
		};
	}

	/** Merges multiple category blocks into a single category block. */
	private mergeCategoryBlocks(blocks: TCategoryBlock[]): TCategoryBlock {
		const first = blocks[0];
		const last = blocks[blocks.length - 1];

		if (first == null || last == null) {
			throw new Error('Cannot merge empty block array');
		}

		const activities = blocks.flatMap((block) => block.activities);

		return {
			type: 'category',
			startMs: first.startMs,
			endMs: last.endMs,
			category: this.getDominantCategoryFromActivities(activities),
			categories: this.getCategoriesSortedByDuration(activities),
			activities
		};
	}

	private extractCategory(activity: specta.WindowActivityDto): FocusViewCategory | null {
		const category = activity.category;
		return category === 'focused' || category === 'neutral' || category === 'distracting'
			? category
			: null;
	}

	private getDominantCategoryFromActivities(
		activities: specta.WindowActivityDto[]
	): FocusViewCategory | null {
		return this.getCategoriesSortedByDuration(activities)[0]?.category ?? null;
	}

	private getCategoriesSortedByDuration(
		activities: specta.WindowActivityDto[]
	): TCategoryBlock['categories'] {
		const durationByCategory = new Map<FocusViewCategory | null, number>();

		for (const activity of activities) {
			const category = this.extractCategory(activity);
			const duration = activity.endedAt - activity.startedAt;
			durationByCategory.set(category, (durationByCategory.get(category) ?? 0) + duration);
		}

		return Array.from(durationByCategory.entries())
			.map(([category, durationMs]) => ({ category, durationMs }))
			.sort((a, b) => b.durationMs - a.durationMs);
	}

	// MARK: - Helpers

	private getVisibleActivities(startMs: number, endMs: number): specta.WindowActivityDto[] {
		return this._activities
			.filter((activity) => activity.endedAt > startMs && activity.startedAt < endMs)
			.sort((a, b) => a.startedAt - b.startedAt);
	}

	/** Extracts all activities from any block type. */
	private getActivitiesFromBlock(block: TActivityBlock): specta.WindowActivityDto[] {
		switch (block.type) {
			case 'window':
				return block.windows;
			case 'window-group':
				return block.segments.flatMap((s) => s.windows);
			case 'app':
				return block.activities;
			case 'category':
				return block.activities;
		}
	}

	/** Converts milliseconds to pixels using current timeline scale. */
	public msToPx(ms: number): number {
		return this.timelineCx.msToPx(ms);
	}

	/** Gets the pixel width of a block. */
	private getBlockWidthPx(block: { startMs: number; endMs: number }): number {
		return this.msToPx(block.endMs) - this.msToPx(block.startMs);
	}
}

export interface TActivityTrackCxThresholds {
	/** Minimum block width in pixels for window-level merging (default: 8) */
	minSegmentPx: number;
	/** Minimum block width in pixels for app-level merging (default: 12) */
	minGroupPx: number;
}

export interface TActivityTrackCxOptions extends Partial<TActivityTrackCxThresholds> {}
