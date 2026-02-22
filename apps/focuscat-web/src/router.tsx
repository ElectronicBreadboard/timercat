import { createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';

// Maps each domain to its route subtree so the browser URL stays clean.
// See docs/decisions/web-presence-strategy.md for the full strategy.
const domainRewrite = {
	input({ url }: { url: URL }) {
		if (url.hostname.includes('pomodorocat') && !url.pathname.startsWith('/sites/pomodorocat')) {
			url.pathname = '/sites/pomodorocat' + url.pathname;
		}
		return url;
	},
	// Strip the internal prefix so links and history show the clean domain URL.
	output({ url }: { url: URL }) {
		if (url.pathname.startsWith('/sites/pomodorocat')) {
			url.pathname = url.pathname.replace(/^\/sites\/pomodorocat/, '') || '/';
		}
		return url;
	}
};

export function getRouter() {
	const router = createRouter({
		routeTree,
		defaultPreload: 'intent',
		scrollRestoration: true,
		rewrite: domainRewrite
	});
	return router;
}
