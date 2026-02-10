import { createState } from 'feature-state';
import type { TimelineCx } from '@/components';
import type { specta } from '@/environment';
import type { TActivityBlock, TAppBlock, TAppInfo, TWindowBlock, TWindowGroupBlock } from './types';

export class ActivityRowCx {
	public readonly timelineCx: TimelineCx;
	public readonly $blocks = createState<TActivityBlock[]>([]);

	private _config: TActivityRowCxConfig;
	private _activities: specta.WindowActivityDto[];
	private _lastResolution: number = -1;
	private _unlisteners: Array<() => void> = [];

	constructor(
		timelineCx: TimelineCx,
		activities: specta.WindowActivityDto[],
		options: TActivityRowCxOptions = {}
	) {
		const { minWindowBlockPx = 8, minAppBlockPx = 12 } = options;
		this.timelineCx = timelineCx;
		this._activities = activities;
		this._config = { minWindowBlockPx, minAppBlockPx };

		this.updateBlocks();
		this._unlisteners.push(
			timelineCx.$zoom.listen(() => this.updateBlocks()),
			timelineCx.$containerRect.listen(() => this.updateBlocks())
		);
	}

	public get config(): TActivityRowCxConfig {
		return this._config;
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

	public setConfig(config: Partial<TActivityRowCxConfig>): void {
		this._config = { ...this._config, ...config };
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

	/**
	 * Creates activity blocks via a 4-step aggregation pipeline.
	 * Like map zoom levels: less detail when zoomed out, more when zoomed in.
	 *
	 * Pipeline:
	 * 1. mergeTinyWindowsWithinApp - Merge tiny same-app windows (preserves app identity)
	 * 2. groupConsecutiveSameApp - Create WindowGroups with dividers
	 * 3. mergeTinyGroupsWithNeighbors - Merge tiny groups with smallest neighbor → AppBlocks
	 * 4. clipBlocksToBounds - Clip edge blocks to visible timeline bounds
	 */
	private createBlocks(): TActivityBlock[] {
		const { startMs, endMs } = this.timelineCx;

		// Filter to visible range and sort chronologically
		const visibleActivities = this._activities
			.filter((a) => a.endedAt > startMs && a.startedAt < endMs)
			.sort((a, b) => a.startedAt - b.startedAt);
		if (!visibleActivities.length) {
			return [];
		}

		// Convert activities to initial window blocks
		const windowBlocks = visibleActivities.map((activity) => this.activityToWindowBlock(activity));

		// Run aggregation pipeline
		const mergedWindows = this.mergeTinyWindowsWithinApp(windowBlocks);
		const windowGroups = this.groupConsecutiveSameApp(mergedWindows);
		const mergedGroups = this.mergeTinyGroupsWithNeighbors(windowGroups);

		return this.clipBlocksToBounds(mergedGroups, startMs, endMs);
	}

	/**
	 * Merges tiny same-app blocks while preserving app identity.
	 * Blocks smaller than minWindowBlockPx get merged with adjacent same-app blocks.
	 *
	 * Strategy:
	 * - Accumulate consecutive same-app blocks in a buffer
	 * - Flush when: buffer reaches min size, app changes, or end of input
	 * - On app change: try to merge tiny buffer backward into previous result
	 */
	private mergeTinyWindowsWithinApp(blocks: TWindowBlock[]): TWindowBlock[] {
		const { minWindowBlockPx } = this._config;
		const result: TWindowBlock[] = [];
		let buffer: TWindowBlock[] = [];
		let currentBundleId: string | null = null;

		const flushBuffer = (): void => {
			if (!buffer.length) {
				return;
			}
			result.push(this.mergeWindowBlocks(buffer));
			buffer = [];
		};

		const tryMergeBufferBackward = (): boolean => {
			const lastResult = result[result.length - 1];
			if (
				lastResult == null ||
				lastResult.app.bundleId !== currentBundleId ||
				this.getBufferWidthPx(buffer) >= minWindowBlockPx
			) {
				return false;
			}
			// Buffer is tiny and same app as last result - merge backward
			result[result.length - 1] = this.mergeWindowBlocks([lastResult, ...buffer]);
			buffer = [];
			return true;
		};

		for (const block of blocks) {
			const bundleId = block.app.bundleId;
			const isAppChange = bundleId !== currentBundleId;

			if (isAppChange && buffer.length > 0) {
				// App changed - try merge backward, otherwise flush
				if (!tryMergeBufferBackward()) {
					flushBuffer();
				}
			}

			currentBundleId = bundleId;
			buffer.push(block);

			// Flush if buffer reached minimum visible size
			if (this.getBufferWidthPx(buffer) >= minWindowBlockPx) {
				flushBuffer();
			}
		}

		// Handle remaining buffer
		if (buffer.length > 0) {
			if (!tryMergeBufferBackward()) {
				flushBuffer();
			}
		}

		return result;
	}

	/**
	 * Groups consecutive same-app WindowBlocks into WindowGroupBlocks.
	 */
	private groupConsecutiveSameApp(blocks: TWindowBlock[]): TWindowGroupBlock[] {
		const result: TWindowGroupBlock[] = [];
		let currentGroup: TWindowBlock[] = [];
		let currentBundleId: string | null = null;

		const flushGroup = (): void => {
			if (!currentGroup.length) {
				return;
			}
			result.push(this.windowBlocksToGroup(currentGroup));
			currentGroup = [];
		};

		for (const block of blocks) {
			const bundleId = block.app.bundleId;

			if (currentBundleId != null && bundleId !== currentBundleId) {
				flushGroup();
			}

			currentGroup.push(block);
			currentBundleId = bundleId;
		}

		flushGroup();
		return result;
	}

	/**
	 * Merges tiny WindowGroups with their smallest neighbor.
	 * "Smallest neighbor" preference minimizes disruption to large blocks.
	 *
	 * Strategy:
	 * - Accumulate tiny groups in a buffer
	 * - When hitting a large group, decide: merge buffer with left or right neighbor?
	 * - Pick the smaller neighbor to absorb the buffer
	 */
	private mergeTinyGroupsWithNeighbors(groups: TWindowGroupBlock[]): TActivityBlock[] {
		const { minAppBlockPx } = this._config;
		const result: TActivityBlock[] = [];
		let tinyBuffer: TActivityBlock[] = [];

		const flushTinyBuffer = (): void => {
			if (!tinyBuffer.length) {
				return;
			}
			result.push(this.mergeBlocksIntoAppBlock(tinyBuffer));
			tinyBuffer = [];
		};

		for (const group of groups) {
			const widthPx = this.getBlockWidthPx(group);
			const isLargeEnough = widthPx >= minAppBlockPx;

			if (isLargeEnough) {
				this.handleLargeGroup(group, tinyBuffer, result);
				tinyBuffer = [];
			} else {
				tinyBuffer.push(group);
			}
		}

		// Handle trailing tiny buffer - merge with left neighbor if available
		if (tinyBuffer.length > 0) {
			const leftNeighbor = result.pop();
			if (leftNeighbor != null) {
				tinyBuffer = [leftNeighbor, ...tinyBuffer];
			}
			flushTinyBuffer();
		}

		return this.mergeConsecutiveSameDominantApp(result);
	}

	/**
	 * Handles a large group by deciding where to place accumulated tiny blocks.
	 * Compares left vs right neighbor size and merges tiny buffer with the smaller one.
	 */
	private handleLargeGroup(
		largeGroup: TWindowGroupBlock,
		tinyBuffer: TActivityBlock[],
		result: TActivityBlock[]
	): void {
		if (!tinyBuffer.length) {
			result.push(largeGroup);
			return;
		}

		const leftNeighbor = result[result.length - 1];

		if (leftNeighbor == null) {
			// No left neighbor - merge tiny buffer with right (the large group)
			result.push(this.mergeBlocksIntoAppBlock([...tinyBuffer, largeGroup]));
			return;
		}

		const leftWidth = this.getBlockWidthPx(leftNeighbor);
		const rightWidth = this.getBlockWidthPx(largeGroup);

		if (leftWidth <= rightWidth) {
			// Left is smaller or equal - merge tiny buffer with left
			result.pop();
			result.push(this.mergeBlocksIntoAppBlock([leftNeighbor, ...tinyBuffer]));
			result.push(largeGroup);
		} else {
			// Right is smaller - merge tiny buffer with right
			result.push(this.mergeBlocksIntoAppBlock([...tinyBuffer, largeGroup]));
		}
	}

	/**
	 * Merges consecutive AppBlocks that have the same dominant app.
	 * Cleans up artifacts from the merging process.
	 */
	private mergeConsecutiveSameDominantApp(blocks: TActivityBlock[]): TActivityBlock[] {
		const result: TActivityBlock[] = [];

		for (const block of blocks) {
			const last = result[result.length - 1];
			const canMerge =
				last?.type === 'app' &&
				block.type === 'app' &&
				last.apps[0]?.bundleId === block.apps[0]?.bundleId;

			if (canMerge) {
				const lastAppBlock = last as TAppBlock;
				const currentAppBlock = block as TAppBlock;
				const mergedActivities = [...lastAppBlock.activities, ...currentAppBlock.activities];

				result[result.length - 1] = {
					type: 'app',
					startMs: lastAppBlock.startMs,
					endMs: currentAppBlock.endMs,
					apps: this.getAppsSortedByDuration(mergedActivities),
					activities: mergedActivities
				};
			} else {
				result.push(block);
			}
		}

		return result;
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

	/** Extracts all activities from any block type. */
	private getActivitiesFromBlock(block: TActivityBlock): specta.WindowActivityDto[] {
		switch (block.type) {
			case 'window':
				return block.windows;
			case 'window-group':
				return block.segments.flatMap((s) => s.windows);
			case 'app':
				return block.activities;
		}
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

	/** Converts milliseconds to pixels using current timeline scale. */
	public msToPx(ms: number): number {
		return this.timelineCx.msToPx(ms);
	}

	/** Gets the pixel width of a block. */
	private getBlockWidthPx(block: { startMs: number; endMs: number }): number {
		return this.msToPx(block.endMs) - this.msToPx(block.startMs);
	}

	/** Gets the combined pixel width of a buffer of blocks. */
	private getBufferWidthPx(buffer: TWindowBlock[]): number {
		const first = buffer[0];
		const last = buffer[buffer.length - 1];

		if (first == null || last == null) {
			return 0;
		}

		return this.msToPx(last.endMs) - this.msToPx(first.startMs);
	}
}

export interface TActivityRowCxOptions {
	/** Minimum block width in pixels for window-level merging (default: 8) */
	minWindowBlockPx?: number;
	/** Minimum block width in pixels for app-level merging (default: 12) */
	minAppBlockPx?: number;
}

export type TActivityRowCxConfig = Required<TActivityRowCxOptions>;
