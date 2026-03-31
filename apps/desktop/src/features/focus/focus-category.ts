export function categoryToColor(category: FocusViewCategory | null): string {
	switch (category) {
		case 'focused':
			return 'var(--color-primary)';
		case 'neutral':
			return 'var(--color-base-400)';
		case 'distracting':
			return '#ef4444';
		default:
			return 'var(--color-base-300)'; // no active profile
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
