import type { specta } from '@/environment';
import type { FocusViewCategory } from '../focus-category';

/**
 * Activity block union type for timeline display.
 */
export type TActivityBlock = TWindowGroupBlock | TAppBlock | TWindowBlock | TCategoryBlock;

/**
 * Window block - contains 1+ windows from the same app.
 */
export interface TWindowBlock {
	type: 'window';
	startMs: number;
	endMs: number;
	app: TAppInfo;
	windows: specta.WindowActivityDto[];
}

export interface TAppInfo {
	bundleId: string;
	name: string;
	icon: string | null;
	color: string | null;
}

/**
 * Window group block - groups consecutive window segments from the same app.
 */
export interface TWindowGroupBlock {
	type: 'window-group';
	startMs: number;
	endMs: number;
	app: TAppInfo;
	segments: TWindowSegment[];
}

export interface TWindowSegment {
	startMs: number;
	endMs: number;
	windows: specta.WindowActivityDto[];
}

/**
 * App block - multiple apps merged together (too small to show individually).
 */
export interface TAppBlock {
	type: 'app';
	startMs: number;
	endMs: number;
	apps: TAppInfo[]; // Sorted by duration (dominant app first)
	activities: specta.WindowActivityDto[];
}

/**
 * Category block - used in focus view mode.
 * Represents either a single category run or a compact mixed-category block.
 */
export interface TCategoryBlock {
	type: 'category';
	startMs: number;
	endMs: number;
	category: FocusViewCategory | null; // Dominant category (for block color)
	categories: Array<TCategoryInfo>;
	activities: specta.WindowActivityDto[];
}

export interface TCategoryInfo {
	category: FocusViewCategory | null;
	durationMs: number;
}
