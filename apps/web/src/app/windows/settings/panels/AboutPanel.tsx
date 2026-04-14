import React from 'react';
import { appConfig } from '@/environment';
import { SettingGroup, SettingItem } from '@/features/settings';

export const AboutPanel: React.FC = () => {
	return (
		<div className="space-y-6">
			<h1 className="text-base-900 text-xl font-semibold">About</h1>

			<SettingGroup title="Support">
				<SettingItem variant="link" label="Feedback" href={appConfig.help.mailto('Feedback')} />
				<SettingItem
					variant="link"
					label="Request a Feature"
					href={appConfig.help.mailto('Feature Request')}
				/>
				<SettingItem
					variant="link"
					label="Report a Bug"
					href={appConfig.help.mailto('Bug Report')}
				/>
			</SettingGroup>

			<SettingGroup title="App">
				<SettingItem
					variant="link"
					label="Website"
					description="focuscat.app"
					href={appConfig.distribution.website}
				/>
				<SettingItem
					variant="link"
					label="GitHub"
					description="github.com/builder-group/focuscat"
					href={appConfig.distribution.github}
				/>
				<SettingItem variant="link" label="Discord" href={appConfig.help.discord} />
			</SettingGroup>

			<SettingGroup title="Credits">
				<SettingItem
					variant="link"
					label="Bongo Cat"
					description="Inspiration for the cat mechanic"
					href="https://store.steampowered.com/app/3419430/Bongo_Cat/"
				/>
				<SettingItem
					variant="link"
					label="@StrayRogue"
					description="Original Bongo Cat artwork and meme"
					href="https://twitter.com/StrayRogue"
				/>
			</SettingGroup>

			<SettingGroup title="Legal">
				<SettingItem variant="link" label="Privacy Policy" href={appConfig.help.legal.privacy} />
				<SettingItem variant="link" label="Terms of Use" href={appConfig.help.legal.terms} />
			</SettingGroup>

			<div className="text-base-400 space-y-1 text-center text-xs">
				<p>FocusCat {appConfig.version}</p>
				<p>© {new Date().getFullYear()} builder.group</p>
			</div>
		</div>
	);
};
