import type { TFocusCategory, TTimerSettings } from './types';

export const timerConfig = {
	settings: {
		workDuration: 25 * 60,
		shortBreakDuration: 5 * 60,
		longBreakDuration: 15 * 60,
		sessionsBeforeLongBreak: 4
	} satisfies TTimerSettings,

	categories: [
		{ id: 'general', name: 'General', color: '#EF4444' },
		{ id: 'work', name: 'Work', color: '#3B82F6' },
		{ id: 'study', name: 'Study', color: '#10B981' },
		{ id: 'personal', name: 'Personal', color: '#8B5CF6' }
	] satisfies TFocusCategory[]
};
