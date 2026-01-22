import type { specta } from '@/environment';

/**
 * Discriminated union for activity blocks.
 * Block type is determined by density (items per pixel), not global zoom level.
 */
export type TActivityBlock = TWindowBlock | TAppBlock | TClusterBlock;

/**
 * Individual window activity - shown when density is low enough.
 */
export interface TWindowBlock {
	type: 'window';
	activity: specta.WindowActivityDto;
	startMs: number;
	endMs: number;
	isAppStart: boolean; // First window of this app segment (for rounded corners)
	isAppEnd: boolean; // Last window of this app segment (for rounded corners)
}

/**
 * Aggregated app block - groups multiple windows of same app.
 * Shown when window density is too high but app density is acceptable.
 */
export interface TAppBlock {
	type: 'app';
	bundleId: string;
	appName: string;
	appIcon: string | null;
	appColor: string | null;
	startMs: number;
	endMs: number;
	windowCount: number;
	windows: specta.WindowActivityDto[]; // Keep reference for tooltips
}

/**
 * Cluster block - groups multiple apps during rapid switching.
 * Shown when even app-level density is too high.
 */
export interface TClusterBlock {
	type: 'cluster';
	startMs: number;
	endMs: number;
	dominantApp: {
		bundleId: string;
		appName: string;
		appIcon: string | null;
		appColor: string | null;
	};
	appCount: number;
	activityCount: number;
	apps: TAppBlock[]; // Keep reference for tooltips
}

/**
 * Intermediate type: groups consecutive same-app activities.
 * Used during block creation before deciding window vs app level.
 */
export interface TAppSegment {
	bundleId: string;
	appName: string;
	appIcon: string | null;
	appColor: string | null;
	startMs: number;
	endMs: number;
	windows: specta.WindowActivityDto[];
}

/**
 * Configuration for density thresholds.
 */
export interface TBlockConfig {
	/** Max windows per pixel before aggregating to app level (default: 0.1 = 1 window per 10px) */
	windowToAppThreshold: number;
	/** Max apps per pixel before aggregating to cluster level (default: 0.05 = 1 app per 20px) */
	appToClusterThreshold: number;
}

export const DEFAULT_BLOCK_CONFIG: TBlockConfig = {
	windowToAppThreshold: 0.1,
	appToClusterThreshold: 0.05
};
