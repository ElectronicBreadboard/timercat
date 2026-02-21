import * as v from 'valibot';
import { validateEnvVar } from 'validatenv';
import { vValidator } from 'validation-adapters/valibot';

const env = validateEnvVar(
	{
		envKey: 'NODE_ENV',
		value: import.meta.env.MODE,
		validator: vValidator(v.picklist(['development', 'production', 'local', 'test'])),
		defaultValue: 'development' as const
	},
	{}
);

const packageVersion = validateEnvVar(
	{
		envKey: 'PACKAGE_VERSION',
		// @ts-expect-error -- https://vite.dev/guide/env-and-mode#env-variables
		value: import.meta.env.PACKAGE_VERSION,
		validator: vValidator(v.string()),
		defaultValue: '0.0.0'
	},
	{}
);

export const appConfig = {
	env,
	packageVersion,
	version: `v${packageVersion}${env.slice(0, 1)}`,
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
