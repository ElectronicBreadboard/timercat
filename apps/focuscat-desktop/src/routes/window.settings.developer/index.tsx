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

	const updateDebug = React.useCallback(
		(updates: Partial<specta.DebugSettings>) => {
			settingsCx.update({ debug: { ...settings.debug, ...updates } });
		},
		[settingsCx, settings.debug]
	);

	const cycleTimerSpeed = React.useCallback(() => {
		const speeds = [1, 2, 5, 10, 60, 120];
		const currentIndex = speeds.indexOf(settings.debug.timerSpeed);
		const nextIndex = (currentIndex + 1) % speeds.length;
		updateDebug({ timerSpeed: speeds[nextIndex] });
	}, [settings.debug.timerSpeed, updateDebug]);

	// MARK: - UI

	return (
		<div className="space-y-6">
			<h1 className="text-base-900 text-xl font-semibold">Developer</h1>

			<SettingGroup title="Debug Tools">
				<SettingItem
					variant="button"
					label="Timer Speed"
					description="Speed up timer for testing"
					onClick={cycleTimerSpeed}
				>
					<span className="text-base-500 font-mono text-sm">{settings.debug.timerSpeed}x</span>
				</SettingItem>
				<SettingItem label="Cat Debug" description="Enable debug mode for cat window">
					<Switch
						checked={settings.debug.cat}
						onCheckedChange={(checked) => updateDebug({ cat: checked })}
						size="sm"
					/>
				</SettingItem>
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
