import type { specta } from '@/environment';

/**
 * Activity block union type for timeline display.
 * - Window: 1+ windows from same app (has window-level detail)
 * - App: 1+ apps (used when different apps merge or app-only tracking)
 */
export type TActivityBlock = TWindowBlock | TAppBlock;

/**
 * Position within a same-app block sequence for visual styling.
 * - solo: Only block from this app, fully rounded
 * - start: First in sequence, left rounded, right dashed
 * - center: Middle, no rounding, right dashed
 * - end: Last in sequence, right rounded, no dashed
 */
export type TWindowPosition = 'solo' | 'start' | 'center' | 'end';

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
 * Window block - contains 1+ windows from the SAME app.
 * Has position styling for visual chaining with other same-app blocks.
 */
export interface TWindowBlock {
	type: 'window';
	startMs: number;
	endMs: number;
	app: TAppInfo;
	windows: specta.WindowActivityDto[];
	position: TWindowPosition;
}

/**
 * App block - contains 1+ apps.
 * Used when different apps are merged together, or for app-only tracking.
 * Shows stripe overlay when apps.length > 1.
 */
export interface TAppBlock {
	type: 'app';
	startMs: number;
	endMs: number;
	apps: TAppInfo[];
	activities: specta.WindowActivityDto[];
}
