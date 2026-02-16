export const appConfig = {
	help: {
		discord: 'https://discord.com/invite/w4xE3bSjhQ',
		email: 'support@focuscat.app',
		githubIssues: 'https://github.com/builder-group/isshin/issues',
		mailto: (subject: string) =>
			`mailto:${appConfig.help.email}?subject=${encodeURIComponent(`[Focuscat] ${subject}`)}`,
		legal: {
			privacy: 'https://focuscat.app/legal/privacy',
			terms: 'https://focuscat.app/legal/terms'
		}
	},
	distribution: {
		website: 'https://focuscat.app',
		github: 'https://github.com/builder-group/isshin',
		githubReleases: 'https://github.com/builder-group/isshin/releases'
	},
	githubApi: 'https://api.github.com/repos/builder-group/isshin'
} as const;
