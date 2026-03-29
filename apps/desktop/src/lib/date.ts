export function getLocalDateKey(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

export function parseLocalDateKey(dateKey: string): Date | null {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
		return null;
	}

	const [year, month, day] = dateKey.split('-').map(Number);
	const parsed = new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);

	// Re-check the rendered key so invalid dates like 2026-02-31 are rejected
	// instead of being normalized by the Date constructor.
	if (getLocalDateKey(parsed) !== dateKey) {
		return null;
	}

	return parsed;
}

export function parseSearchDate(value: unknown): string | null {
	if (typeof value !== 'string') {
		return null;
	}

	return parseLocalDateKey(value) != null ? value : null;
}
