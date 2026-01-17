import { createFileRoute } from '@tanstack/react-router';
import { useFeatureState } from 'feature-react/state';
import React from 'react';
import { Button, FolderOpenIcon, IconButton, SettingGroup, SettingItem, Switch } from '@/components';
import { specta } from '@/environment';
import { useSettingsCx } from '@/features/settings';
import { useTimerCx } from '@/features/timer';

export const Route = createFileRoute('/window/settings/developer/')({
	component: RouteComponent
});

function RouteComponent() {
	const settingsCx = useSettingsCx();
	const settings = useFeatureState(settingsCx.$appSettings);
	const timerCx = useTimerCx();
	const timer = useFeatureState(timerCx.$timer);

	// MARK: - Actions

	const handleDebugToggle = React.useCallback(
		(checked: boolean) => {
			settingsCx.update({ debug: checked });
		},
		[settingsCx]
	);

	// MARK: - UI

	return (
		<div className="space-y-6">
			<h1 className="text-xl font-semibold text-gray-900">Developer</h1>

			<SettingGroup title="Debug">
				<SettingItem label="Debug Mode" description="Show debug information">
					<Switch checked={settings.debug} onCheckedChange={handleDebugToggle} />
				</SettingItem>
			</SettingGroup>

			{settings.debug && (
				<SettingGroup title="Debug Tools">
					{timer != null && (
						<SettingItem label="Timer Speed" description="Speed up timer for testing">
							<Button variant="ghost" size="sm" onClick={timerCx.cycleSpeed} className="font-mono">
								{timer.speed}x
							</Button>
						</SettingItem>
					)}
					<SettingItem label="Data Directory" description="Open app data folder in Finder">
						<IconButton
							variant="default"
							size="sm"
							onClick={() => specta.commands.openDataDirectory()}
							aria-label="Open data directory"
						>
							<FolderOpenIcon size={18} />
						</IconButton>
					</SettingItem>
				</SettingGroup>
			)}
		</div>
	);
}
