export function formatTime(seconds: number): string {
	const totalSecs = Math.floor(seconds);
	const mins = Math.floor(totalSecs / 60);
	const secs = totalSecs % 60;
	return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function formatTimeOfDay(date: Date): string {
	return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function formatTimeOfDayAmPm(date: Date): string {
	return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

/**
 * Format seconds as human-readable duration (e.g., "1h 30m", "45m", "30s")
 */
export function formatDuration(totalSeconds: number): string {
	if (totalSeconds < 60) {
		return `${Math.round(totalSeconds)}s`;
	}
	const totalMinutes = Math.round(totalSeconds / 60);
	const hours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;
	if (hours === 0) {
		return `${minutes}m`;
	}
	if (minutes === 0) {
		return `${hours}h`;
	}
	return `${hours}h ${minutes}m`;
}

/**
 * Format date as relative string (e.g., "Today", "Yesterday", "Jan 15")
 */
export function formatRelativeDate(date: Date): string {
	const now = new Date();
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
	const diffDays = Math.floor((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));

	if (diffDays === 0) {
		return 'Today';
	}
	if (diffDays === 1) {
		return 'Yesterday';
	}
	if (diffDays < 7) {
		return date.toLocaleDateString('en-US', { weekday: 'long' });
	}
	return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
