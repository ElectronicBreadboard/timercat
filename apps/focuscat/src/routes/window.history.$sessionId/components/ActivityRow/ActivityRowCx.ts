import { createState } from 'feature-state';
import type { TimelineCx } from '@/components';
import type { specta } from '@/environment';
import type { TActivityBlock, TAppBlock, TAppInfo, TWindowBlock, TWindowSegment } from './types';

export class ActivityRowCx {
	public readonly timelineCx: TimelineCx;
	public readonly $blocks = createState<TActivityBlock[]>([]);

	private _config: TActivityRowCxConfig;
	private _activities: specta.WindowActivityDto[];
	private _lastResolution: number = -1;
	private _unlisteners: Array<() => void> = [];
	private _updateTimeout: ReturnType<typeof setTimeout> | null = null;

	public constructor(
		timelineCx: TimelineCx,
		activities: specta.WindowActivityDto[],
		options: TActivityRowCxOptions = {}
	) {
		const { minWindowBlockPx = 8, minAppBlockPx = 12 } = options;
		this.timelineCx = timelineCx;
		this._activities = activities;
		this._config = { minWindowBlockPx, minAppBlockPx };

		// Listen for zoom/container changes to auto-update blocks
		this._unlisteners.push(
			timelineCx.$zoom.listen(() => this.update()),
			timelineCx.$containerRect.listen(() => this.update())
		);

		// Initial block computation
		this.update();
	}

	public get config(): TActivityRowCxConfig {
		return this._config;
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

	public setConfig(config: Partial<TActivityRowCxConfig>): void {
		this._config = { ...this._config, ...config };
		this._lastResolution = -1;
		this.update();
	}

	public msToPx(ms: number): number {
		return this.timelineCx.msToPx(ms);
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
		}, 200);
	}

	/**
	 * Creates activity blocks with two-level merging:
	 * 1. Window-level: merge small windows within same app
	 * 2. App-level: merge small blocks across apps
	 */
	private createBlocks(): TActivityBlock[] {
		const { startMs, endMs } = this.timelineCx;

		const activities = this._activities
			.filter((a) => a.endedAt > startMs && a.startedAt < endMs)
			.sort((a, b) => a.startedAt - b.startedAt);
		if (!activities.length) {
			return [];
		}

		const windowBlocks = this.createWindowBlocks(activities);
		const mergedBlocks = this.mergeSmallBlocks(windowBlocks);
		const groupedBlocks = this.groupWindowBlocks(mergedBlocks);

		return this.clipToBounds(groupedBlocks, startMs, endMs);
	}

	/**
	 * Groups consecutive same-app activities into WindowBlocks,
	 * merging small windows within each app segment.
	 */
	private createWindowBlocks(activities: specta.WindowActivityDto[]): TWindowBlock[] {
		const { minWindowBlockPx } = this._config;
		const blocks: TWindowBlock[] = [];
		let currentBundleId: string | null = null;
		let currentWindows: specta.WindowActivityDto[] = [];

		const flushGroup = () => {
			if (!currentWindows.length) {
				return;
			}

			const firstWindow = currentWindows[0];
			if (firstWindow == null) {
				return;
			}

			const app = this.extractAppInfo(firstWindow);
			let pending: specta.WindowActivityDto[] = [];

			const flushPending = () => {
				const first = pending[0];
				const last = pending[pending.length - 1];
				if (first == null || last == null) {
					return;
				}
				blocks.push({
					type: 'window',
					startMs: first.startedAt,
					endMs: last.endedAt,
					app,
					windows: [...pending]
				});
				pending = [];
			};

			for (const window of currentWindows) {
				const widthPx = this.msToPx(window.endedAt) - this.msToPx(window.startedAt);

				if (widthPx >= minWindowBlockPx) {
					if (pending.length > 0) {
						pending.push(window);
						flushPending();
					} else {
						blocks.push({
							type: 'window',
							startMs: window.startedAt,
							endMs: window.endedAt,
							app,
							windows: [window]
						});
					}
				} else {
					pending.push(window);
					const first = pending[0];
					if (first != null) {
						const groupWidthPx = this.msToPx(window.endedAt) - this.msToPx(first.startedAt);
						if (groupWidthPx >= minWindowBlockPx) {
							flushPending();
						}
					}
				}
			}

			// Trailing: merge into last block or flush standalone
			if (pending.length > 0) {
				const lastBlock = blocks[blocks.length - 1];
				const lastPending = pending[pending.length - 1];
				if (lastBlock != null && lastPending != null && lastBlock.app.bundleId === app.bundleId) {
					lastBlock.windows.push(...pending);
					lastBlock.endMs = lastPending.endedAt;
				} else {
					flushPending();
				}
			}

			currentWindows = [];
		};

		for (const activity of activities) {
			const bundleId = activity.appBundleId ?? 'unknown';
			if (bundleId !== currentBundleId) {
				flushGroup();
				currentBundleId = bundleId;
			}
			currentWindows.push(activity);
		}
		flushGroup();

		return blocks;
	}

	/**
	 * Merges blocks that are too small, potentially combining different apps.
	 * Also merges consecutive AppBlocks with same dominant app.
	 */
	private mergeSmallBlocks(blocks: TWindowBlock[]): (TWindowBlock | TAppBlock)[] {
		const { minAppBlockPx } = this._config;
		const result: (TWindowBlock | TAppBlock)[] = [];
		let pending: TWindowBlock[] = [];

		const getPendingWidthPx = (): number => {
			const first = pending[0];
			const last = pending[pending.length - 1];
			if (first == null || last == null) {
				return 0;
			}
			return this.msToPx(last.endMs) - this.msToPx(first.startMs);
		};

		const flush = () => {
			if (!pending.length) {
				return;
			}

			const newBlock = this.createBlockFromWindowBlocks(pending);

			// Merge consecutive AppBlocks with same dominant app
			const last = result[result.length - 1];
			if (
				last?.type === 'app' &&
				newBlock.type === 'app' &&
				last.apps[0]?.bundleId === newBlock.apps[0]?.bundleId
			) {
				result.pop();
				const mergedActivities = [...last.activities, ...newBlock.activities];
				result.push({
					type: 'app',
					startMs: last.startMs,
					endMs: newBlock.endMs,
					apps: this.getAppsByDuration(mergedActivities),
					activities: mergedActivities
				});
			} else {
				result.push(newBlock);
			}

			pending = [];
		};

		for (const block of blocks) {
			const widthPx = this.msToPx(block.endMs) - this.msToPx(block.startMs);

			if (widthPx >= minAppBlockPx) {
				if (pending.length > 0) {
					pending.push(block);
					flush();
				} else {
					result.push(block);
				}
			} else {
				pending.push(block);
				if (getPendingWidthPx() >= minAppBlockPx) {
					flush();
				}
			}
		}

		// Trailing: merge with last result or flush standalone
		if (pending.length > 0) {
			const last = result.pop();
			if (last != null) {
				// Prepend last block to pending (maintaining order)
				const blocksToMerge = this.blockToWindowBlocks(last);
				pending = [...blocksToMerge, ...pending];
			}
			flush();
		}

		return result;
	}

	/** Converts any block type back to WindowBlocks for re-merging */
	private blockToWindowBlocks(block: TWindowBlock | TAppBlock): TWindowBlock[] {
		if (block.type === 'window') {
			return [block];
		}

		// Convert AppBlock activities back to individual WindowBlocks
		return block.activities.map((activity) => ({
			type: 'window' as const,
			startMs: activity.startedAt,
			endMs: activity.endedAt,
			app: this.extractAppInfo(activity),
			windows: [activity]
		}));
	}

	/** Creates WindowBlock or AppBlock from accumulated window blocks */
	private createBlockFromWindowBlocks(blocks: TWindowBlock[]): TWindowBlock | TAppBlock {
		const first = blocks[0];
		const last = blocks[blocks.length - 1];
		if (first == null || last == null) {
			console.warn('[ActivityRowCx] createBlockFromWindowBlocks called with empty array');
			return {
				type: 'window',
				startMs: 0,
				endMs: 0,
				app: { bundleId: 'unknown', name: 'Unknown', icon: null, color: null },
				windows: []
			};
		}

		const uniqueBundleIds = new Set(blocks.map((b) => b.app.bundleId));
		if (uniqueBundleIds.size === 1) {
			return {
				type: 'window',
				startMs: first.startMs,
				endMs: last.endMs,
				app: first.app,
				windows: blocks.flatMap((b) => b.windows)
			};
		}

		const allActivities = blocks.flatMap((b) => b.windows);
		return {
			type: 'app',
			startMs: first.startMs,
			endMs: last.endMs,
			apps: this.getAppsByDuration(allActivities),
			activities: allActivities
		};
	}

	/** Groups consecutive same-app WindowBlocks into TWindowGroupBlock */
	private groupWindowBlocks(blocks: (TWindowBlock | TAppBlock)[]): TActivityBlock[] {
		const result: TActivityBlock[] = [];
		let windowSequence: TWindowBlock[] = [];
		let currentBundleId: string | null = null;

		const flushWindowSequence = () => {
			const first = windowSequence[0];
			const last = windowSequence[windowSequence.length - 1];
			if (first == null || last == null) {
				return;
			}

			const segments: TWindowSegment[] = windowSequence.map((block) => ({
				startMs: block.startMs,
				endMs: block.endMs,
				windows: block.windows
			}));

			result.push({
				type: 'window-group',
				startMs: first.startMs,
				endMs: last.endMs,
				app: first.app,
				segments
			});
			windowSequence = [];
			currentBundleId = null;
		};

		for (const block of blocks) {
			if (block.type === 'window') {
				const bundleId = block.app.bundleId;
				if (currentBundleId == null || bundleId === currentBundleId) {
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

	private extractAppInfo(activity: specta.WindowActivityDto): TAppInfo {
		return {
			bundleId: activity.appBundleId ?? 'unknown',
			name: activity.appName ?? 'Unknown',
			icon: activity.appIcon,
			color: activity.appColor
		};
	}

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
