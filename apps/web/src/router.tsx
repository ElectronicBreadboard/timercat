import { createRouter } from '@tanstack/react-router';
import { sitesConfig } from '@/environment';
import { routeTree } from './routeTree.gen';

export function getRouter() {
	const router = createRouter({
		routeTree,
		defaultPreload: 'intent',
		scrollRestoration: true,
		rewrite: {
			input({ url }) {
				const entry = sitesConfig.domainRewrites.find((e) => e.hostnames.includes(url.hostname));
				if (entry != null && !url.pathname.startsWith(entry.pathPrefix)) {
					url.pathname = entry.pathPrefix + url.pathname;
				}
				return url;
			},
			output({ url }) {
				const entry = sitesConfig.domainRewrites.find((e) => url.pathname.startsWith(e.pathPrefix));
				if (entry != null) {
					url.pathname = url.pathname.slice(entry.pathPrefix.length) || '/';
				}
				return url;
			}
		}
	});
	return router;
}
