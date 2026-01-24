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

	public constructor(
		timelineCx: TimelineCx,
		activities: specta.WindowActivityDto[],
		options: TActivityRowCxOptions = {}
	) {
		const { minWindowBlockPx = 8, minAppBlockPx = 12 } = options;
		this.timelineCx = timelineCx;
		this._activities = activities;
		this._config = { minWindowBlockPx, minAppBlockPx };

		// Auto-update blocks on zoom/container changes
		this._unlisteners.push(
			timelineCx.$zoom.listen(() => this.update()),
			timelineCx.$containerRect.listen(() => this.update())
		);

		this.update();
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
		this.update();
	}

	public setConfig(config: Partial<TActivityRowCxConfig>): void {
		this._config = { ...this._config, ...config };
		this._lastResolution = -1;
		this.update();
	}

	public msToPx(ms: number): number {
		return this.timelineCx.msToPx(ms);
	}

	/** Only recomputes when resolution changes (avoids unnecessary work during smooth zoom). */
	private update(): void {
		const resolution = this.timelineCx.getMarkerResolution();
		if (resolution === this._lastResolution) {
			return;
		}
		this._lastResolution = resolution;
		this.$blocks.set(this.createBlocks());
	}

	/**
	 * Creates activity blocks via a 4-step pipeline (like map zoom - less detail when zoomed out):
	 * 1. mergeTinyWithinApp - Merge tiny same-app windows (preserves app identity)
	 * 2. groupIntoWindowGroups - Create WindowGroups with dividers
	 * 3. mergeTinyGroups - Merge tiny groups with smallest neighbor → AppBlocks
	 * 4. clipToBounds - Clip edge blocks to timeline bounds
	 */
	private createBlocks(): TActivityBlock[] {
		const { startMs, endMs } = this.timelineCx;

		const activities = this._activities
			.filter((a) => a.endedAt > startMs && a.startedAt < endMs)
			.sort((a, b) => a.startedAt - b.startedAt);
		if (!activities.length) {
			return [];
		}

		const windowBlocks = activities.map((activity) => ({
			type: 'window' as const,
			startMs: activity.startedAt,
			endMs: activity.endedAt,
			app: this.extractAppInfo(activity),
			windows: [activity]
		}));
		const mergedWindows = this.mergeTinyWithinApp(windowBlocks);
		const windowGroups = this.groupIntoWindowGroups(mergedWindows);
		const mergedGroups = this.mergeTinyGroups(windowGroups);

		return this.clipToBounds(mergedGroups, startMs, endMs);
	}

	/**
	 * Merges tiny same-app blocks while preserving app identity.
	 * Blocks smaller than minWindowBlockPx get merged with adjacent same-app blocks.
	 */
	private mergeTinyWithinApp(blocks: TWindowBlock[]): TWindowBlock[] {
		const { minWindowBlockPx } = this._config;
		const result: TWindowBlock[] = [];
		let pending: TWindowBlock[] = [];
		let currentBundleId: string | null = null;

		const getPendingWidthPx = (): number => {
			const first = pending[0];
			const last = pending[pending.length - 1];
			if (first == null || last == null) {
				return 0;
			}
			return this.msToPx(last.endMs) - this.msToPx(first.startMs);
		};

		const flush = () => {
			const first = pending[0];
			const last = pending[pending.length - 1];
			if (first == null || last == null) {
				return;
			}
			result.push({
				type: 'window',
				startMs: first.startMs,
				endMs: last.endMs,
				app: first.app,
				windows: pending.flatMap((b) => b.windows)
			});
			pending = [];
		};

		for (const block of blocks) {
			const bundleId = block.app.bundleId;

			// App changed - try to merge pending backward if tiny, otherwise flush
			if (bundleId !== currentBundleId) {
				if (pending.length > 0) {
					const last = result[result.length - 1];
					const lastPending = pending[pending.length - 1];
					if (
						getPendingWidthPx() < minWindowBlockPx &&
						last != null &&
						lastPending != null &&
						last.app.bundleId === currentBundleId
					) {
						// Pending is tiny and last result is same app - merge backward
						last.windows.push(...pending.flatMap((b) => b.windows));
						last.endMs = lastPending.endMs;
						pending = [];
					} else {
						flush();
					}
				}
				currentBundleId = bundleId;
			}

			const widthPx = this.msToPx(block.endMs) - this.msToPx(block.startMs);

			if (widthPx >= minWindowBlockPx) {
				if (pending.length > 0) {
					pending.push(block);
					flush();
				} else {
					result.push(block);
				}
			} else {
				pending.push(block);
				if (getPendingWidthPx() >= minWindowBlockPx) {
					flush();
				}
			}
		}

		// Trailing: merge into last block or flush standalone
		if (pending.length > 0) {
			const last = result[result.length - 1];
			const lastPending = pending[pending.length - 1];
			if (last != null && lastPending != null && last.app.bundleId === currentBundleId) {
				last.windows.push(...pending.flatMap((b) => b.windows));
				last.endMs = lastPending.endMs;
			} else {
				flush();
			}
		}

		return result;
	}

	/** Groups consecutive same-app WindowBlocks into WindowGroupBlocks with divider segments. */
	private groupIntoWindowGroups(blocks: TWindowBlock[]): TWindowGroupBlock[] {
		const result: TWindowGroupBlock[] = [];
		let windowSequence: TWindowBlock[] = [];
		let currentBundleId: string | null = null;

		const flush = () => {
			const first = windowSequence[0];
			const last = windowSequence[windowSequence.length - 1];
			if (first == null || last == null) {
				return;
			}

			result.push({
				type: 'window-group',
				startMs: first.startMs,
				endMs: last.endMs,
				app: first.app,
				segments: windowSequence.map((block) => ({
					startMs: block.startMs,
					endMs: block.endMs,
					windows: block.windows
				}))
			});
			windowSequence = [];
		};

		for (const block of blocks) {
			const bundleId = block.app.bundleId;
			if (currentBundleId == null || bundleId === currentBundleId) {
				windowSequence.push(block);
				currentBundleId = bundleId;
			} else {
				flush();
				windowSequence.push(block);
				currentBundleId = bundleId;
			}
		}

		flush();
		return result;
	}

	/**
	 * Merges tiny WindowGroups with their smallest neighbor.
	 * Compares left vs right neighbor and picks smaller to minimize disruption.
	 */
	private mergeTinyGroups(groups: TWindowGroupBlock[]): TActivityBlock[] {
		const { minAppBlockPx } = this._config;
		const result: TActivityBlock[] = [];
		let pending: TActivityBlock[] = [];

		const flushPending = () => {
			const first = pending[0];
			if (first == null) {
				return;
			}
			let merged: TActivityBlock = first;
			for (let i = 1; i < pending.length; i++) {
				const next = pending[i];
				if (next != null) {
					merged = this.mergeAdjacentBlocks(merged, next);
				}
			}
			result.push(merged);
			pending = [];
		};

		for (const group of groups) {
			const widthPx = this.msToPx(group.endMs) - this.msToPx(group.startMs);

			if (widthPx >= minAppBlockPx) {
				// Large block - decide where to merge accumulated tiny blocks
				if (pending.length > 0) {
					const leftNeighbor = result[result.length - 1];
					const rightNeighbor = group;

					if (leftNeighbor == null) {
						// No left neighbor - merge with right
						pending.push(rightNeighbor);
						flushPending();
					} else {
						const leftWidth = this.msToPx(leftNeighbor.endMs) - this.msToPx(leftNeighbor.startMs);
						const rightWidth = widthPx;

						if (leftWidth <= rightWidth) {
							// Left is smaller - merge pending with left
							result.pop();
							pending = [leftNeighbor, ...pending];
							flushPending();
							result.push(rightNeighbor);
						} else {
							// Right is smaller - merge pending with right
							pending.push(rightNeighbor);
							flushPending();
						}
					}
				} else {
					result.push(group);
				}
			} else {
				// Tiny block - accumulate
				pending.push(group);
			}
		}

		// Trailing: merge with left neighbor if exists
		if (pending.length > 0) {
			const leftNeighbor = result[result.length - 1];
			if (leftNeighbor != null) {
				result.pop();
				pending = [leftNeighbor, ...pending];
			}
			flushPending();
		}

		// Merge consecutive AppBlocks with same dominant app
		return this.mergeConsecutiveSameDominantAppBlocks(result);
	}

	/** Merges consecutive AppBlocks that have the same dominant app. */
	private mergeConsecutiveSameDominantAppBlocks(blocks: TActivityBlock[]): TActivityBlock[] {
		const result: TActivityBlock[] = [];

		for (const block of blocks) {
			const last = result[result.length - 1];

			if (
				last?.type === 'app' &&
				block.type === 'app' &&
				last.apps[0]?.bundleId === block.apps[0]?.bundleId
			) {
				// Same dominant app - merge
				result.pop();
				const mergedActivities = [...last.activities, ...block.activities];
				result.push({
					type: 'app',
					startMs: last.startMs,
					endMs: block.endMs,
					apps: this.getAppsByDuration(mergedActivities),
					activities: mergedActivities
				});
			} else {
				result.push(block);
			}
		}

		return result;
	}

	/** Merges two adjacent blocks into an AppBlock (since adjacent groups are always different apps). */
	private mergeAdjacentBlocks(a: TActivityBlock, b: TActivityBlock): TAppBlock {
		const activitiesA = this.getActivitiesFromBlock(a);
		const activitiesB = this.getActivitiesFromBlock(b);
		const allActivities = [...activitiesA, ...activitiesB];

		return {
			type: 'app',
			startMs: a.startMs,
			endMs: b.endMs,
			apps: this.getAppsByDuration(allActivities),
			activities: allActivities
		};
	}

	/** Extracts all activities from any block type. */
	private getActivitiesFromBlock(block: TActivityBlock): specta.WindowActivityDto[] {
		switch (block.type) {
			case 'window-group':
				return block.segments.flatMap((s) => s.windows);
			case 'app':
				return block.activities;
			case 'window':
				return block.windows;
		}
	}

	/** Extracts app metadata from an activity for display. */
	private extractAppInfo(activity: specta.WindowActivityDto): TAppInfo {
		return {
			bundleId: activity.appBundleId ?? 'unknown',
			name: activity.appName ?? 'Unknown',
			icon: activity.appIcon,
			color: activity.appColor
		};
	}

	/** Gets unique apps sorted by total duration (dominant app first). */
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

	/** Clips first/last blocks to timeline bounds (activities may extend beyond visible range). */
	private clipToBounds(blocks: TActivityBlock[], startMs: number, endMs: number): TActivityBlock[] {
		return blocks.map((block, i) => {
			const clippedStart = i === 0 ? Math.max(block.startMs, startMs) : block.startMs;
			const clippedEnd = i === blocks.length - 1 ? Math.min(block.endMs, endMs) : block.endMs;

			if (clippedStart === block.startMs && clippedEnd === block.endMs) {
				return block;
			}

			if (block.type === 'window-group') {
				const clippedSegments = block.segments.map((segment, j) => {
					const segmentClippedStart =
						j === 0 ? Math.max(segment.startMs, clippedStart) : segment.startMs;
					const segmentClippedEnd =
						j === block.segments.length - 1 ? Math.min(segment.endMs, clippedEnd) : segment.endMs;

					if (segmentClippedStart === segment.startMs && segmentClippedEnd === segment.endMs) {
						return segment;
					}
					return { ...segment, startMs: segmentClippedStart, endMs: segmentClippedEnd };
				});

				return { ...block, startMs: clippedStart, endMs: clippedEnd, segments: clippedSegments };
			}

			return { ...block, startMs: clippedStart, endMs: clippedEnd };
		});
	}
}

export interface TActivityRowCxOptions {
	/** Minimum block width in pixels for window-level merging (default: 8) */
	minWindowBlockPx?: number;
	/** Minimum block width in pixels for app-level merging (default: 12) */
	minAppBlockPx?: number;
}

export type TActivityRowCxConfig = Required<TActivityRowCxOptions>;
