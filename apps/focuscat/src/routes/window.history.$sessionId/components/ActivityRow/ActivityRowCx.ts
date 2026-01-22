import { createState } from 'feature-state';
import type { TimelineCx } from '@/components';
import type { specta } from '@/environment';
import type { TActivityBlock, TAppBlock, TAppInfo, TWindowBlock } from './types';

export class ActivityRowCx {
	public readonly timelineCx: TimelineCx;
	public readonly config: TActivityRowCxConfig;
	public readonly $blocks = createState<TActivityBlock[]>([]);

	private _activities: specta.WindowActivityDto[];
	private _lastResolution: number = -1;
	private _unlisteners: Array<() => void> = [];
	private _updateTimeout: ReturnType<typeof setTimeout> | null = null;

	constructor(
		timelineCx: TimelineCx,
		activities: specta.WindowActivityDto[],
		options: TActivityRowCxOptions = {}
	) {
		const { minBlockPx = 8 } = options;
		this.timelineCx = timelineCx;
		this._activities = activities;
		this.config = { minBlockPx };

		// Listen for zoom/container changes to auto-update blocks
		this._unlisteners.push(
			timelineCx.$zoom.listen(() => this.update())
			// timelineCx.$containerRect.listen(() => this.update())
		);

		// Initial block computation
		this.update();
	}

	public unmount(): void {
		for (const unlisten of this._unlisteners) {
			unlisten();
		}
		this._unlisteners = [];
		if (this._updateTimeout != null) {
			clearTimeout(this._updateTimeout);
			this._updateTimeout = null;
		}
	}

	public setActivities(activities: specta.WindowActivityDto[]): void {
		this._activities = activities;
		this._lastResolution = -1;
		this.update();
	}

	/** Recompute blocks if resolution changed */
	private update(): void {
		const applyUpdate = () => {
			const resolution = this.timelineCx.getMarkerResolution();
			if (resolution === this._lastResolution) {
				return;
			}
			this._lastResolution = resolution;
			this.$blocks.set(this.createBlocks());
		};

		// First update should be immediate
		if (this._lastResolution === -1) {
			applyUpdate();
			return;
		}

		// Debounce subsequent updates to avoid jumpy reorganization during zoom
		if (this._updateTimeout != null) {
			clearTimeout(this._updateTimeout);
		}
		this._updateTimeout = setTimeout(() => {
			this._updateTimeout = null;
			applyUpdate();
		}, 150);
	}

	// MARK: - Position Helpers

	public msToPx(ms: number): number {
		return this.timelineCx.msToPx(ms);
	}

	public get containerWidth(): number {
		return this.timelineCx.containerWidth;
	}

	public get $scrollLeft() {
		return this.timelineCx.$scrollLeft;
	}

	public get $zoom() {
		return this.timelineCx.$zoom;
	}

	public get $containerRect() {
		return this.timelineCx.$containerRect;
	}

	// MARK: - Block Creation

	/**
	 * Creates activity blocks with two-level merging:
	 * 1. Window-level merge within same-app segments
	 * 2. App-level merge across segments
	 * 3. Merge consecutive AppBlocks with same dominant app
	 */
	private createBlocks(): TActivityBlock[] {
		const { startMs, endMs } = this.timelineCx;

		if (this._activities.length === 0) return [];

		// Step 1: Filter to visible and sort
		const visible = this._activities.filter((a) => a.endedAt > startMs && a.startedAt < endMs);
		if (visible.length === 0) return [];

		const sorted = [...visible].sort((a, b) => a.startedAt - b.startedAt);

		// Step 2: Group consecutive same-app activities
		const appSegments = this.groupByApp(sorted);

		// Step 3: Window-level merge within each segment
		const windowLevelItems = appSegments.flatMap((segment) => this.mergeWindowsInSegment(segment));

		// Step 4: App-level merge across segments
		const appLevelBlocks = this.mergeAcrossApps(windowLevelItems);

		// Step 5: Merge consecutive AppBlocks with same dominant app
		const mergedAppBlocks = this.mergeConsecutiveAppBlocks(appLevelBlocks);

		// Step 6: Assign positions to same-app WindowBlock sequences
		const blocksWithPositions = this.assignWindowPositions(mergedAppBlocks);

		// Step 7: Clip to bounds
		return this.clipToBounds(blocksWithPositions, startMs, endMs);
	}

	// MARK: - Step 2: Group by App

	private groupByApp(activities: specta.WindowActivityDto[]): TAppSegment[] {
		const firstActivity = activities[0];
		if (firstActivity == null) return [];

		const segments: TAppSegment[] = [];
		let current: TAppSegment = {
			app: this.extractAppInfo(firstActivity),
			windows: [firstActivity]
		};

		for (let i = 1; i < activities.length; i++) {
			const activity = activities[i];
			if (activity == null) continue;
			const bundleId = activity.appBundleId ?? 'unknown';

			if (bundleId === current.app.bundleId) {
				current.windows.push(activity);
			} else {
				segments.push(current);
				current = {
					app: this.extractAppInfo(activity),
					windows: [activity]
				};
			}
		}
		segments.push(current);

		return segments;
	}

	private extractAppInfo(activity: specta.WindowActivityDto): TAppInfo {
		return {
			bundleId: activity.appBundleId ?? 'unknown',
			name: activity.appName ?? 'Unknown',
			icon: activity.appIcon,
			color: activity.appColor
		};
	}

	// MARK: - Step 3: Window-level Merge

	private mergeWindowsInSegment(segment: TAppSegment): TWindowLevelItem[] {
		const { app, windows } = segment;
		const items: TWindowLevelItem[] = [];
		let mergeGroup: specta.WindowActivityDto[] = [];

		const flushMergeGroup = () => {
			const first = mergeGroup[0];
			const last = mergeGroup[mergeGroup.length - 1];
			if (first == null || last == null) return;

			items.push({
				startMs: first.startedAt,
				endMs: last.endedAt,
				app,
				windows: [...mergeGroup]
			});
			mergeGroup = [];
		};

		for (const window of windows) {
			const widthPx = this.msToPx(window.endedAt) - this.msToPx(window.startedAt);

			if (widthPx >= this.config.minBlockPx) {
				// Large window: combine with any undersized merge group
				if (mergeGroup.length > 0) {
					mergeGroup.push(window);
					flushMergeGroup();
				} else {
					items.push({
						startMs: window.startedAt,
						endMs: window.endedAt,
						app,
						windows: [window]
					});
				}
			} else {
				mergeGroup.push(window);

				const groupFirst = mergeGroup[0];
				if (groupFirst != null) {
					const groupWidthPx = this.msToPx(window.endedAt) - this.msToPx(groupFirst.startedAt);
					if (groupWidthPx >= this.config.minBlockPx) {
						flushMergeGroup();
					}
				}
			}
		}

		// Handle remaining merge group
		if (mergeGroup.length > 0) {
			const lastItem = items[items.length - 1];
			const lastMerged = mergeGroup[mergeGroup.length - 1];
			if (lastItem != null && lastMerged != null) {
				lastItem.windows.push(...mergeGroup);
				lastItem.endMs = lastMerged.endedAt;
			} else {
				flushMergeGroup();
			}
		}

		return items;
	}

	// MARK: - Step 4: App-level Merge

	private mergeAcrossApps(items: TWindowLevelItem[]): TActivityBlock[] {
		if (items.length === 0) return [];

		const blocks: TActivityBlock[] = [];
		let mergeGroup: TWindowLevelItem[] = [];

		const getMergeGroupWidth = () => {
			const first = mergeGroup[0];
			const last = mergeGroup[mergeGroup.length - 1];
			if (first == null || last == null) return 0;
			return this.msToPx(last.endMs) - this.msToPx(first.startMs);
		};

		const flushMergeGroup = () => {
			if (mergeGroup.length === 0) return;

			const uniqueBundleIds = new Set(mergeGroup.map((item) => item.app.bundleId));

			if (uniqueBundleIds.size === 1) {
				blocks.push(this.createWindowBlock(mergeGroup));
			} else {
				blocks.push(this.createAppBlock(mergeGroup));
			}

			mergeGroup = [];
		};

		for (const item of items) {
			const widthPx = this.msToPx(item.endMs) - this.msToPx(item.startMs);

			if (widthPx >= this.config.minBlockPx) {
				// Large item: combine with any undersized merge group
				if (mergeGroup.length > 0) {
					mergeGroup.push(item);
					flushMergeGroup();
				} else {
					blocks.push(this.createWindowBlock([item]));
				}
			} else {
				mergeGroup.push(item);

				if (getMergeGroupWidth() >= this.config.minBlockPx) {
					flushMergeGroup();
				}
			}
		}

		// Handle remaining merge group
		if (mergeGroup.length > 0) {
			const lastBlock = blocks.pop();
			if (lastBlock != null) {
				const combinedItems = this.blockToItems(lastBlock).concat(mergeGroup);
				const uniqueBundleIds = new Set(combinedItems.map((item) => item.app.bundleId));

				if (uniqueBundleIds.size === 1) {
					blocks.push(this.createWindowBlock(combinedItems));
				} else {
					blocks.push(this.createAppBlock(combinedItems));
				}
			} else {
				flushMergeGroup();
			}
		}

		return blocks;
	}

	private blockToItems(block: TActivityBlock): TWindowLevelItem[] {
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
				return block.activities.map((activity) => ({
					startMs: activity.startedAt,
					endMs: activity.endedAt,
					app: this.extractAppInfo(activity),
					windows: [activity]
				}));
		}
	}

	// MARK: - Step 5: Merge Consecutive AppBlocks

	/** Merge consecutive AppBlocks that have the same dominant app */
	private mergeConsecutiveAppBlocks(blocks: TActivityBlock[]): TActivityBlock[] {
		if (blocks.length === 0) return blocks;

		const result: TActivityBlock[] = [];
		let pendingAppBlocks: TAppBlock[] = [];

		const flushPendingAppBlocks = () => {
			const first = pendingAppBlocks[0];
			if (first == null) return;

			if (pendingAppBlocks.length === 1) {
				result.push(first);
			} else {
				// Merge all pending AppBlocks into one
				const last = pendingAppBlocks[pendingAppBlocks.length - 1];
				if (last == null) return;

				const allActivities = pendingAppBlocks.flatMap((b) => b.activities);
				result.push({
					type: 'app',
					startMs: first.startMs,
					endMs: last.endMs,
					apps: this.getAppsByDuration(allActivities),
					activities: allActivities
				});
			}
			pendingAppBlocks = [];
		};

		for (const block of blocks) {
			if (block.type === 'app') {
				const dominantBundleId = block.apps[0]?.bundleId;
				const pendingDominantId = pendingAppBlocks[0]?.apps[0]?.bundleId;

				if (pendingAppBlocks.length === 0 || dominantBundleId === pendingDominantId) {
					pendingAppBlocks.push(block);
				} else {
					flushPendingAppBlocks();
					pendingAppBlocks.push(block);
				}
			} else {
				flushPendingAppBlocks();
				result.push(block);
			}
		}

		flushPendingAppBlocks();
		return result;
	}

	// MARK: - Step 6: Assign Positions

	private assignWindowPositions(blocks: TActivityBlock[]): TActivityBlock[] {
		const result: TActivityBlock[] = [];
		let windowSequence: TWindowBlock[] = [];
		let currentBundleId: string | null = null;

		const flushWindowSequence = () => {
			const first = windowSequence[0];
			if (first == null) return;

			if (windowSequence.length === 1) {
				first.position = 'solo';
			} else {
				first.position = 'start';
				for (let i = 1; i < windowSequence.length - 1; i++) {
					const block = windowSequence[i];
					if (block != null) block.position = 'center';
				}
				const last = windowSequence[windowSequence.length - 1];
				if (last != null) last.position = 'end';
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

	// MARK: - Block Creators

	private createWindowBlock(items: TWindowLevelItem[]): TWindowBlock {
		const first = items[0];
		const last = items[items.length - 1];
		// These are guaranteed by callers, but provide fallbacks for type safety
		const startMs = first?.startMs ?? 0;
		const endMs = last?.endMs ?? 0;
		const app = first?.app ?? { bundleId: 'unknown', name: 'Unknown', icon: null, color: null };

		return {
			type: 'window',
			startMs,
			endMs,
			app,
			windows: items.flatMap((item) => item.windows),
			position: 'solo'
		};
	}

	private createAppBlock(items: TWindowLevelItem[]): TAppBlock {
		const first = items[0];
		const last = items[items.length - 1];
		// These are guaranteed by callers, but provide fallbacks for type safety
		const startMs = first?.startMs ?? 0;
		const endMs = last?.endMs ?? 0;

		const allActivities = items.flatMap((item) => item.windows);
		return {
			type: 'app',
			startMs,
			endMs,
			apps: this.getAppsByDuration(allActivities),
			activities: allActivities
		};
	}

	// MARK: - Helpers

	/** Get unique apps sorted by total duration (dominant app first) */
	private getAppsByDuration(activities: specta.WindowActivityDto[]): TAppInfo[] {
		const appDurations = new Map<string, { app: TAppInfo; durationMs: number }>();

		for (const activity of activities) {
			const bundleId = activity.appBundleId ?? 'unknown';
			const duration = activity.endedAt - activity.startedAt;
			const existing = appDurations.get(bundleId);

			if (existing != null) {
				existing.durationMs += duration;
			} else {
				appDurations.set(bundleId, {
					app: this.extractAppInfo(activity),
					durationMs: duration
				});
			}
		}

		return Array.from(appDurations.values())
			.sort((a, b) => b.durationMs - a.durationMs)
			.map((entry) => entry.app);
	}

	private clipToBounds(blocks: TActivityBlock[], startMs: number, endMs: number): TActivityBlock[] {
		if (blocks.length === 0) return blocks;

		return blocks.map((block, i) => {
			const clippedStart = i === 0 ? Math.max(block.startMs, startMs) : block.startMs;
			const clippedEnd = i === blocks.length - 1 ? Math.min(block.endMs, endMs) : block.endMs;

			if (clippedStart === block.startMs && clippedEnd === block.endMs) {
				return block;
			}

			return { ...block, startMs: clippedStart, endMs: clippedEnd };
		});
	}
}

// MARK: - Types

export interface TActivityRowCxOptions {
	/** Minimum block width in pixels before merging (default: 8) */
	minBlockPx?: number;
}

export type TActivityRowCxConfig = Required<TActivityRowCxOptions>;

interface TAppSegment {
	app: TAppInfo;
	windows: specta.WindowActivityDto[];
}

interface TWindowLevelItem {
	startMs: number;
	endMs: number;
	app: TAppInfo;
	windows: specta.WindowActivityDto[];
}
