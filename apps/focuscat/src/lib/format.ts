export function formatTime(seconds: number): string {
	const mins = Math.floor(seconds / 60);
	const secs = seconds % 60;
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
