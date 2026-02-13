import { createFileRoute } from '@tanstack/react-router';
import { useFeatureState } from 'feature-react/state';
import React from 'react';
import { Banner, Switch } from '@/components';
import { specta } from '@/environment';
import { useAccessibilityPermission } from '@/features/permission';
import { SettingGroup, SettingItem, useSettingsCx } from '@/features/settings';

export const Route = createFileRoute('/window/settings/activity/')({
	component: RouteComponent
});

function RouteComponent() {
	const settingsCx = useSettingsCx();
	const settings = useFeatureState(settingsCx.$appSettings);
	const accessibility = useAccessibilityPermission();

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

			{accessibility.granted === false && (
				<Banner variant="warning">
					<p className="text-sm font-medium">Accessibility permission required</p>
					<p className="text-xs opacity-80">
						Activity tracking needs Accessibility access to monitor window changes.{' '}
						<button
							type="button"
							onClick={accessibility.openSettings}
							className="font-medium underline underline-offset-2 hover:opacity-80"
						>
							Open System Settings
						</button>
					</p>
				</Banner>
			)}

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
