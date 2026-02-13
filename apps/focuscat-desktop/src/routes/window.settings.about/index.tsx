import { createFileRoute } from '@tanstack/react-router';
import { openUrl } from '@tauri-apps/plugin-opener';
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

			<SettingGroup title="Links">
				<SettingItem
					variant="external-link"
					label="Website"
					description="focuscat.app"
					onClick={() => openUrl('https://focuscat.app')}
				/>
				<SettingItem
					variant="external-link"
					label="Privacy Policy"
					description="How we handle your data"
					onClick={() => openUrl('https://focuscat.app/legal/privacy')}
				/>
			</SettingGroup>

			<div className="text-base-400 space-y-1 text-center text-xs">
				<p>Focuscat {appInfo.version}</p>
				<p>builder.group</p>
			</div>
		</div>
	);
}
