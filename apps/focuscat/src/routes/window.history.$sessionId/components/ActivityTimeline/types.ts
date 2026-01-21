import { specta } from '@/environment';

export interface TActivityBlock {
	// Position
	leftPx: number;
	widthPx: number;

	// Display
	color: string;
	appName: string;
	appIcon: string | null;

	// Detail
	type: 'window' | 'app' | 'cluster';
	windowTitle: string | null;
	windowCount: number;
	appCount: number;

	// Timing
	durationSec: number;

	// Visual hints
	isAppStart: boolean; // First block of an app group (round left)
	isAppEnd: boolean; // Last block of an app group (round right)
	dividers: number[]; // Relative px positions for window dividers within app blocks
}

export interface TWindow {
	activity: specta.WindowActivityDto;
	leftPx: number;
	widthPx: number;
}

export interface TAppGroup {
	bundleId: string;
	leftPx: number;
	widthPx: number;
	windows: TWindow[];
	color: string;
	appName: string;
	appIcon: string | null;
}
