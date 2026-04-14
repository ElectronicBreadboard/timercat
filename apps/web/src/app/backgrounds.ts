import type { TBackground } from '@/features/settings';

export const appBackgroundOrder: TBackground[] = ['sage', 'cream', 'night', 'lofi'];

export const appBackgrounds: Record<
	TBackground,
	{ label: string; className: string; previewClassName: string; showFireflies: boolean }
> = {
	sage: {
		label: 'Sage',
		className: 'bg-[radial-gradient(circle_at_top,_#f4f8eb_0%,_#dde7cf_48%,_#bcc9ab_100%)]',
		previewClassName: 'bg-[radial-gradient(circle_at_top,_#f4f8eb_0%,_#dde7cf_48%,_#bcc9ab_100%)]',
		showFireflies: false
	},
	cream: {
		label: 'Cream',
		className: 'bg-[radial-gradient(circle_at_top,_#fff8f0_0%,_#f1e3cf_52%,_#ddcdb5_100%)]',
		previewClassName: 'bg-[radial-gradient(circle_at_top,_#fff8f0_0%,_#f1e3cf_52%,_#ddcdb5_100%)]',
		showFireflies: false
	},
	night: {
		label: 'Night',
		className: 'bg-[radial-gradient(circle_at_top,_#344762_0%,_#1d2c42_50%,_#0f1928_100%)]',
		previewClassName: 'bg-[radial-gradient(circle_at_top,_#344762_0%,_#1d2c42_50%,_#0f1928_100%)]',
		showFireflies: false
	},
	lofi: {
		label: 'Lofi',
		className:
			"bg-[url('/illustrations/backgrounds/japanese-lofi.png')] bg-cover bg-center bg-no-repeat",
		previewClassName:
			"bg-[url('/illustrations/backgrounds/japanese-lofi.png')] bg-cover bg-center bg-no-repeat",
		showFireflies: true
	}
};
