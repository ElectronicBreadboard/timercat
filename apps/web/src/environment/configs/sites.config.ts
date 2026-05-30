export const sitesConfig = {
	// See docs/decisions/web-presence-strategy.md for the domain routing strategy
	domainRewrites: [
		{
			hostnames: ['pomodorocat.com', 'www.pomodorocat.com', 'pomodorocat.localhost', 'timercat.vercel.app'] as string[],
			pathPrefix: '/sites/pomodorocat'
		}
	]
} as const;
