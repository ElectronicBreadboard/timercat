import type { specta } from '@/environment';

/**
 * Activity block union type for timeline display.
 * - Window: Individual window shown when space permits
 * - WindowMerged: Multiple windows from same app merged
 * - AppMerged: Multiple different apps merged together
 */
export type TActivityBlock = TWindowBlock | TWindowMergedBlock | TAppMergedBlock;

/**
 * Position within a same-app window sequence for visual styling.
 * - solo: Single window, fully rounded
 * - start: First window, left rounded, right dashed
 * - center: Middle window, no rounding, right dashed
 * - end: Last window, right rounded, no dashed
 */
export type TWindowPosition = 'solo' | 'start' | 'center' | 'end';

/**
 * Individual window block - shown when there's enough space (>= 8px).
 */
export interface TWindowBlock {
	type: 'window';
	startMs: number;
	endMs: number;
	activity: specta.WindowActivityDto;
	/** Position within app segment for visual styling */
	position: TWindowPosition;
}

/**
 * Merged window block - multiple windows from the SAME app merged together.
 * Created when some windows are too small individually.
 */
export interface TWindowMergedBlock {
	type: 'window-merged';
	startMs: number;
	endMs: number;
	bundleId: string;
	appName: string;
	appIcon: string | null;
	appColor: string | null;
	windows: specta.WindowActivityDto[];
}

/**
 * Merged app block - multiple DIFFERENT apps merged together.
 * Created when app segments are too small individually.
 * Has a stripe overlay to indicate mixed content.
 */
export interface TAppMergedBlock {
	type: 'app-merged';
	startMs: number;
	endMs: number;
	dominantApp: {
		bundleId: string;
		appName: string;
		appIcon: string | null;
		appColor: string | null;
	};
	activities: specta.WindowActivityDto[];
	uniqueApps: Array<{ bundleId: string; appName: string; appIcon: string | null }>;
}
