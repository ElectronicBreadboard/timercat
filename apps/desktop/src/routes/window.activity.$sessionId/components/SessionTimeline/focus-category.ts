import type { specta } from '@/environment';

export function categoryToColor(category: FocusViewCategory | null): string {
	switch (category) {
		case 'focused':
			return '#22c55e';
		case 'neutral':
			return '#94a3b8';
		case 'distracting':
			return '#ef4444';
		default:
			return '#e2e8f0'; // no active profile
	}
}

export function categoryToLabel(category: FocusViewCategory | null): string {
	switch (category) {
		case 'focused':
			return 'Focused';
		case 'neutral':
			return 'Neutral';
		case 'distracting':
			return 'Distracting';
		default:
			return 'Uncategorized';
	}
}

export type FocusViewCategory = 'focused' | 'neutral' | 'distracting';

export type TViewMode = 'apps' | 'focus';
