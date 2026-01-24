import type { specta } from '@/environment';

/**
 * Activity block union type for timeline display.
 */
export type TActivityBlock = TWindowGroupBlock | TAppBlock | TWindowBlock;

/**
 * App info structure used in blocks.
 */
export interface TAppInfo {
	bundleId: string;
	name: string;
	icon: string | null;
	color: string | null;
}

/**
 * Window block - contains 1+ windows from the same app.
 * Currently always grouped into WindowGroupBlock by the aggregation algorithm,
 * but kept as a valid block type for potential direct rendering at high zoom levels.
 */
export interface TWindowBlock {
	type: 'window';
	startMs: number;
	endMs: number;
	app: TAppInfo;
	windows: specta.WindowActivityDto[];
}

/**
 * Window segment within a group - contains 1+ windows.
 * Simplified version of TWindowBlock without type/app (inherited from group).
 */
export interface TWindowSegment {
	startMs: number;
	endMs: number;
	windows: specta.WindowActivityDto[];
}

/**
 * Window group block - groups consecutive window segments from the same app.
 * Container has rounded corners; individual segments render inside.
 */
export interface TWindowGroupBlock {
	type: 'window-group';
	startMs: number;
	endMs: number;
	app: TAppInfo;
	segments: TWindowSegment[];
}

/**
 * App block - contains 1+ apps merged together.
 * Shows stripe overlay when apps.length > 1.
 */
export interface TAppBlock {
	type: 'app';
	startMs: number;
	endMs: number;
	apps: TAppInfo[];
	activities: specta.WindowActivityDto[];
}
