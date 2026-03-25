import type { specta } from '@/environment';

/** Returns the category with the most total duration across the given activities. */
export function getDominantCategory(
	activities: specta.WindowActivityDto[]
): FocusViewCategory | null {
	const durations = new Map<string, number>();
	for (const a of activities) {
		if (a.category == null) continue;
		durations.set(a.category, (durations.get(a.category) ?? 0) + (a.endedAt - a.startedAt));
	}
	if (durations.size === 0) return null;
	let dominant: string | null = null;
	let max = 0;
	for (const [cat, dur] of durations) {
		if (dur > max) {
			max = dur;
			dominant = cat;
		}
	}
	return dominant as FocusViewCategory | null;
}

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
