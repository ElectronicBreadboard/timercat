import { createFileRoute } from '@tanstack/react-router';
import { appConfig } from '@/environment';
import { SettingGroup, SettingItem } from '@/features/settings';
import { useAppInfo } from '@/hooks';

export const Route = createFileRoute('/window/settings/about/')({
	component: RouteComponent
});

function RouteComponent() {
	const appInfo = useAppInfo();

	return (
		<div className="space-y-6">
			<h1 className="text-base-900 text-xl font-semibold">About</h1>

			<SettingGroup>
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

			<SettingGroup>
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
			</SettingGroup>

			<SettingGroup>
				<SettingItem variant="link" label="Privacy Policy" href={appConfig.help.legal.privacy} />
				<SettingItem variant="link" label="Terms of Use" href={appConfig.help.legal.terms} />
			</SettingGroup>

			<div className="text-base-400 space-y-1 text-center text-xs">
				<p>FocusCat {appInfo.version}</p>
				<p>© {new Date().getFullYear()} builder.group</p>
			</div>
		</div>
	);
}
