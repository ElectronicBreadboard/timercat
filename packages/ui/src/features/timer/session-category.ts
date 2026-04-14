export function getSessionCategory(sessionType: string): TSessionCategory {
	switch (sessionType) {
		case 'pomodoro:short_break':
		case 'pomodoro:long_break':
		case 'progressive:break':
			return 'break';
		case 'pomodoro:work':
		case 'progressive:work':
		case 'countdown':
			return 'work';
		default:
			return sessionType.endsWith(':work') ? 'work' : 'break';
	}
}

export type TSessionCategory = 'work' | 'break';

export function isWorkSession(sessionType: string): boolean {
	return getSessionCategory(sessionType) === 'work';
}

export function isBreakSession(sessionType: string): boolean {
	return getSessionCategory(sessionType) === 'break';
}
