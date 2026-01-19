import { createFileRoute } from '@tanstack/react-router';
import { useFeatureState } from 'feature-react/state';
import React from 'react';
import { MonitorIcon, MoonIcon, SunIcon, Switch, ToggleGroup } from '@/components';
import { specta } from '@/environment';
import { PermissionBadge, useAccessibilityPermission } from '@/features/permission';
import { SettingGroup, SettingItem, useSettingsCx } from '@/features/settings';

export const Route = createFileRoute('/window/settings/app/')({
	component: RouteComponent
});

function RouteComponent() {
	const settingsCx = useSettingsCx();
	const settings = useFeatureState(settingsCx.$appSettings);
	const accessibility = useAccessibilityPermission();

	// MARK: - Actions

	const updateAppearance = React.useCallback(
		(updates: Partial<specta.AppearanceSettings>) => {
			settingsCx.update({ appearance: { ...settings.appearance, ...updates } });
		},
		[settingsCx, settings.appearance]
	);

	const updateDebug = React.useCallback(
		(updates: Partial<specta.DebugSettings>) => {
			settingsCx.update({ debug: { ...settings.debug, ...updates } });
		},
		[settingsCx, settings.debug]
	);

	// MARK: - UI

	return (
		<div className="space-y-6">
			<h1 className="text-base-900 text-xl font-semibold">App</h1>

			<SettingGroup title="Appearance">
				<SettingItem label="Theme" description="Choose your preferred color scheme">
					<ToggleGroup
						value={settings.appearance.theme}
						onValueChange={(theme) => updateAppearance({ theme: theme as specta.Theme })}
					>
						<ToggleGroup.Item value="light" aria-label="Light theme">
							<SunIcon size={16} />
						</ToggleGroup.Item>
						<ToggleGroup.Item value="auto" aria-label="Auto theme">
							<MonitorIcon size={16} />
						</ToggleGroup.Item>
						<ToggleGroup.Item value="dark" aria-label="Dark theme">
							<MoonIcon size={16} />
						</ToggleGroup.Item>
					</ToggleGroup>
				</SettingItem>
			</SettingGroup>

			<SettingGroup title="Permissions">
				<SettingItem
					variant="link"
					label="Accessibility"
					description="Required for activity tracking"
					onClick={accessibility.openSettings}
				>
					<PermissionBadge status={accessibility.granted} />
				</SettingItem>
			</SettingGroup>

			<SettingGroup title="Advanced">
				<SettingItem label="Developer Mode" description="Show developer tools tab">
					<Switch
						checked={settings.debug.enabled}
						onCheckedChange={(checked) => updateDebug({ enabled: checked })}
					/>
				</SettingItem>
			</SettingGroup>
		</div>
	);
}
