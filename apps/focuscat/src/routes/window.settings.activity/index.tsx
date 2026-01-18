import { createFileRoute } from '@tanstack/react-router';
import { useFeatureState } from 'feature-react/state';
import React from 'react';
import { SettingGroup, SettingItem, Switch } from '@/components';
import { specta } from '@/environment';
import { useSettingsCx } from '@/features/settings';

export const Route = createFileRoute('/window/settings/activity/')({
	component: RouteComponent
});

function RouteComponent() {
	const settingsCx = useSettingsCx();
	const settings = useFeatureState(settingsCx.$appSettings);

	// MARK: - Actions

	const handleTrackingToggle = React.useCallback(
		(enabled: boolean) => {
			if (enabled) {
				// Enable tracking with all sub-options enabled by default
				settingsCx.update({
					activity: { ...settings.activity, enabled: true, trackWindows: true, trackBrowser: true }
				});
			} else {
				// Disable tracking and all sub-options
				settingsCx.update({
					activity: {
						...settings.activity,
						enabled: false,
						trackWindows: false,
						trackBrowser: false
					}
				});
			}
		},
		[settingsCx, settings.activity]
	);

	const updateActivity = React.useCallback(
		(updates: Partial<specta.ActivitySettings>) => {
			settingsCx.update({ activity: { ...settings.activity, ...updates } });
		},
		[settingsCx, settings.activity]
	);

	// MARK: - UI

	return (
		<div className="space-y-6">
			<h1 className="text-base-900 text-xl font-semibold">Activity</h1>

			<SettingGroup title="Tracking">
				<SettingItem label="Enable Tracking" description="Track app usage during focus sessions">
					<Switch checked={settings.activity.enabled} onCheckedChange={handleTrackingToggle} />
				</SettingItem>
				{settings.activity.enabled && (
					<>
						<SettingItem
							label="Track Windows"
							description="Track individual window and tab changes"
						>
							<Switch
								checked={settings.activity.trackWindows}
								onCheckedChange={(checked) => updateActivity({ trackWindows: checked })}
							/>
						</SettingItem>
						<SettingItem label="Track Browser" description="Record visited URLs in browsers">
							<Switch
								checked={settings.activity.trackBrowser}
								onCheckedChange={(checked) => updateActivity({ trackBrowser: checked })}
							/>
						</SettingItem>
					</>
				)}
			</SettingGroup>
		</div>
	);
}
