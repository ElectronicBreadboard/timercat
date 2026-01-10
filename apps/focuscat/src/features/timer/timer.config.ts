import type { specta } from '@/environment';

export const timerConfig = {
	categories: [
		{ id: 'general', name: 'General', color: '#EF4444' },
		{ id: 'work', name: 'Work', color: '#3B82F6' },
		{ id: 'study', name: 'Study', color: '#10B981' },
		{ id: 'personal', name: 'Personal', color: '#8B5CF6' }
	] satisfies specta.FocusCategory[]
};
