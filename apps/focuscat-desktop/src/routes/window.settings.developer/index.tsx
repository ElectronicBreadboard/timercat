import { createFileRoute } from '@tanstack/react-router';
import { useFeatureState } from 'feature-react/state';
import React from 'react';
import { FolderOpenIcon, Switch } from '@/components';
import { specta } from '@/environment';
import { SettingGroup, SettingItem, useSettingsCx } from '@/features/settings';

export const Route = createFileRoute('/window/settings/developer/')({
	component: RouteComponent
});

function RouteComponent() {
	const settingsCx = useSettingsCx();
	const settings = useFeatureState(settingsCx.$appSettings);

	// MARK: - Actions

	const updateDeveloper = React.useCallback(
		(updates: Partial<specta.DeveloperSettings>) => {
			settingsCx.update({ developer: { ...settings.developer, ...updates } });
		},
		[settingsCx, settings.developer]
	);

	const cycleTimerSpeed = React.useCallback(() => {
		const speeds = [1, 2, 5, 10, 60, 120];
		const currentIndex = speeds.indexOf(settings.developer.timerSpeed);
		const nextIndex = (currentIndex + 1) % speeds.length;
		updateDeveloper({ timerSpeed: speeds[nextIndex] });
	}, [settings.developer.timerSpeed, updateDeveloper]);

	// MARK: - UI

	return (
		<div className="space-y-6">
			<h1 className="text-base-900 text-xl font-semibold">Developer</h1>

			<SettingGroup title="Timer">
				<SettingItem
					variant="button"
					label="Timer Speed"
					description="Speed up timer for testing"
					onClick={cycleTimerSpeed}
				>
					<span className="text-base-500 font-mono text-sm">{settings.developer.timerSpeed}x</span>
				</SettingItem>
			</SettingGroup>

			<SettingGroup title="Cat">
				<SettingItem label="Cat debug" description="Show debug borders on cat window">
					<Switch
						checked={settings.developer.cat}
						onCheckedChange={(checked) => updateDeveloper({ cat: checked })}
						size="sm"
					/>
				</SettingItem>
			</SettingGroup>

			<SettingGroup title="App">
				<SettingItem
					variant="link"
					label="Data Directory"
					description="Open app data folder in Finder"
					onClick={() => specta.commands.openDataDirectory()}
				>
					<FolderOpenIcon size={16} className="text-base-400" />
				</SettingItem>
			</SettingGroup>
		</div>
	);
}
