import { createFileRoute } from '@tanstack/react-router';
import { useFeatureState } from 'feature-react/state';
import React from 'react';
import { Switch } from '@/components';
import { specta } from '@/environment';
import { SettingGroup, SettingItem, useSettingsCx } from '@/features/settings';

export const Route = createFileRoute('/window/settings/activity/')({
	component: RouteComponent
});

function RouteComponent() {
	const settingsCx = useSettingsCx();
	const settings = useFeatureState(settingsCx.$appSettings);

	// MARK: - Actions

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
				<SettingItem label="Track Windows" description="Track individual window and tab changes">
					<Switch
						checked={settings.activity.trackWindows}
						onCheckedChange={(checked) => updateActivity({ trackWindows: checked })}
						size="sm"
					/>
				</SettingItem>
				<SettingItem label="Track Browser" description="Record visited URLs in browsers">
					<Switch
						checked={settings.activity.trackBrowser}
						onCheckedChange={(checked) => updateActivity({ trackBrowser: checked })}
						size="sm"
					/>
				</SettingItem>
			</SettingGroup>
		</div>
	);
}
