/**
 * Calculates relative luminance of a hex color.
 * Returns a value between 0 (black) and 1 (white).
 */
function getLuminance(hex: string): number {
	const rgb = hex
		.replace('#', '')
		.match(/.{2}/g)
		?.map((x) => {
			const c = parseInt(x, 16) / 255;
			return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
		});

	if (rgb == null || rgb.length < 3) {
		return 0.5;
	}

	// @ts-expect-error - Checked above
	return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

/**
 * Checks if a hex color is dark (luminance below threshold).
 */
export function isColorDark(hex: string, threshold = 0.3): boolean {
	return getLuminance(hex) < threshold;
}

/**
 * Converts a hex color to an rgba string with the given alpha.
 */
export function hexToRgba(hex: string, alpha: number): string {
	const rgb = hex
		.replace('#', '')
		.match(/.{2}/g)
		?.map((x) => parseInt(x, 16));

	if (rgb == null || rgb.length < 3) {
		return `rgba(0, 0, 0, ${alpha})`;
	}

	return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}
