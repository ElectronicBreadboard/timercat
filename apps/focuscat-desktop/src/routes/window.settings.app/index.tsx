import { createFileRoute } from '@tanstack/react-router';
import { useFeatureState } from 'feature-react/state';
import React from 'react';
import { MonitorIcon, MoonIcon, Slider, SunIcon, Switch, ToggleGroup } from '@/components';
import { specta } from '@/environment';
import {
	PermissionBadge,
	useAccessibilityPermission,
	useInputMonitoringPermission
} from '@/features/permission';
import { SettingGroup, SettingItem, useSettingsCx } from '@/features/settings';
import { useAppInfo } from '@/hooks';

export const Route = createFileRoute('/window/settings/app/')({
	component: RouteComponent
});

function RouteComponent() {
	const settingsCx = useSettingsCx();
	const settings = useFeatureState(settingsCx.$appSettings);
	const accessibility = useAccessibilityPermission();
	const inputMonitoring = useInputMonitoringPermission();
	const appInfo = useAppInfo();
	const isAppStore = appInfo.distribution === 'appStore';

	// MARK: - Actions

	const updateAppearance = React.useCallback(
		(updates: Partial<specta.AppearanceSettings>) => {
			settingsCx.update({ appearance: { ...settings.appearance, ...updates } });
		},
		[settingsCx, settings.appearance]
	);

	const updateFeatures = React.useCallback(
		(updates: Partial<specta.FeaturesSettings>) => {
			settingsCx.update({ features: { ...settings.features, ...updates } });
		},
		[settingsCx, settings.features]
	);

	const updateAudio = React.useCallback(
		(updates: Partial<specta.AudioSettings>) => {
			settingsCx.update({ audio: { ...settings.audio, ...updates } });
		},
		[settingsCx, settings.audio]
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
						size="sm"
					>
						<ToggleGroup.Item value="light" aria-label="Light theme">
							<SunIcon size={14} />
						</ToggleGroup.Item>
						<ToggleGroup.Item value="auto" aria-label="Auto theme">
							<MonitorIcon size={14} />
						</ToggleGroup.Item>
						<ToggleGroup.Item value="dark" aria-label="Dark theme">
							<MoonIcon size={14} />
						</ToggleGroup.Item>
					</ToggleGroup>
				</SettingItem>
			</SettingGroup>

			<SettingGroup title="Audio">
				<SettingItem
					label="Sound effects"
					description="Timer ticks, completion chime, and other sounds"
				>
					<Switch
						checked={settings.audio.enabled}
						onCheckedChange={(checked) => updateAudio({ enabled: checked })}
						size="sm"
					/>
				</SettingItem>
				{settings.audio.enabled && (
					<SettingItem label="Volume" description="Sound effects volume">
						<div className="flex min-w-40 items-center gap-3">
							<span className="text-base-500 shrink-0 text-right text-xs tabular-nums">
								{Math.round(settings.audio.volume * 100)}%
							</span>
							<div className="min-w-0 flex-1">
								<Slider
									value={Math.round(settings.audio.volume * 100)}
									min={0}
									max={100}
									step={5}
									size="sm"
									aria-label="Volume"
									onValueChange={(v) => updateAudio({ volume: v / 100 })}
								/>
							</div>
						</div>
					</SettingItem>
				)}
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
				<SettingItem
					variant="link"
					label="Input Monitoring"
					description="Required for idle detection"
					onClick={inputMonitoring.openSettings}
				>
					<PermissionBadge status={inputMonitoring.granted} />
				</SettingItem>
			</SettingGroup>

			<SettingGroup title="Features">
				<SettingItem label="Focus Goals" description="Track daily focus time targets">
					<Switch
						checked={settings.features.goals}
						onCheckedChange={(checked) => updateFeatures({ goals: checked })}
						size="sm"
					/>
				</SettingItem>
				<SettingItem label="Focus Profiles" description="Block distracting apps and websites">
					<Switch
						checked={settings.features.profiles}
						onCheckedChange={(checked) => updateFeatures({ profiles: checked })}
						size="sm"
					/>
				</SettingItem>
				<SettingItem label="Activity Tracking" description="Record app and window usage">
					<Switch
						checked={settings.features.activity}
						onCheckedChange={(checked) => updateFeatures({ activity: checked })}
						size="sm"
					/>
				</SettingItem>
				<SettingItem
					label="Cat Widget"
					description={
						isAppStore ? 'Not available in App Store builds' : 'Floating cat companion window'
					}
					descriptionClassName={isAppStore ? 'text-yellow-600' : undefined}
					className={isAppStore ? 'bg-base-100' : undefined}
				>
					<Switch
						checked={isAppStore ? false : settings.features.catWindow}
						onCheckedChange={(checked) => !isAppStore && updateFeatures({ catWindow: checked })}
						size="sm"
						disabled={isAppStore}
					/>
				</SettingItem>
				<SettingItem label="Developer Mode" description="Show developer tools and debug info">
					<Switch
						checked={settings.features.developer}
						onCheckedChange={(checked) => updateFeatures({ developer: checked })}
						size="sm"
					/>
				</SettingItem>
			</SettingGroup>
		</div>
	);
}
