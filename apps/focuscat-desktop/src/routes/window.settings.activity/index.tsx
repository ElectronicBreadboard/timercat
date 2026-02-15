import { createFileRoute } from '@tanstack/react-router';
import { useFeatureState } from 'feature-react/state';
import React from 'react';
import { Banner, Switch } from '@/components';
import { specta } from '@/environment';
import { useAccessibilityPermission } from '@/features/permission';
import { SettingGroup, SettingItem, useSettingsCx } from '@/features/settings';
import { useAppInfo } from '@/hooks';

export const Route = createFileRoute('/window/settings/activity/')({
	component: RouteComponent
});

function RouteComponent() {
	const settingsCx = useSettingsCx();
	const settings = useFeatureState(settingsCx.$appSettings);
	const accessibility = useAccessibilityPermission();
	const appInfo = useAppInfo();
	const isAppStore = appInfo.distribution === 'appStore';

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

			{!isAppStore && !accessibility.granted && (
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

			<SettingGroup title="App & Window">
				<SettingItem label="Track Apps" description="Record which apps you use">
					<Switch
						checked={settings.activity.trackApps}
						onCheckedChange={(checked) =>
							updateActivity(
								checked
									? { trackApps: true }
									: { trackApps: false, trackWindows: false, trackBrowser: false }
							)
						}
						size="sm"
					/>
				</SettingItem>
				{settings.activity.trackApps && (
					<SettingItem
						label="Track Windows"
						description={
							isAppStore
								? 'Not available in App Store builds'
								: 'Track individual window and tab changes'
						}
						descriptionClassName={isAppStore ? 'text-yellow-600' : undefined}
						className={isAppStore ? 'bg-base-100' : undefined}
					>
						<Switch
							checked={isAppStore ? false : settings.activity.trackWindows}
							onCheckedChange={(checked) =>
								!isAppStore &&
								updateActivity(
									checked ? { trackWindows: true } : { trackWindows: false, trackBrowser: false }
								)
							}
							size="sm"
							disabled={isAppStore}
						/>
					</SettingItem>
				)}
				{settings.activity.trackApps && settings.activity.trackWindows && (
					<SettingItem
						label="Track Browser"
						description={
							isAppStore ? 'Not available in App Store builds' : 'Record visited URLs in browsers'
						}
						descriptionClassName={isAppStore ? 'text-yellow-600' : undefined}
						className={isAppStore ? 'bg-base-100' : undefined}
					>
						<Switch
							checked={isAppStore ? false : settings.activity.trackBrowser}
							onCheckedChange={(checked) =>
								!isAppStore && updateActivity({ trackBrowser: checked })
							}
							size="sm"
							disabled={isAppStore}
						/>
					</SettingItem>
				)}
			</SettingGroup>
		</div>
	);
}
