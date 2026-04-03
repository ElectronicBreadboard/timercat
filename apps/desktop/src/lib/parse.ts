export function parseSearchBoolean(value: unknown): boolean {
	return value === true || value === 'true';
}

export function parseSearchNumber(value: unknown): number | undefined {
	const parsed = typeof value === 'number' ? value : Number(value);
	return Number.isFinite(parsed) ? parsed : undefined;
}

export function parseSearchString(value: unknown): string | undefined {
	return typeof value === 'string' ? value : undefined;
}
