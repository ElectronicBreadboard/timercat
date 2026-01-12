export function formatTime(seconds: number): string {
	const mins = Math.floor(seconds / 60);
	const secs = seconds % 60;
	return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function formatTimeOfDay(date: Date): string {
	return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}
