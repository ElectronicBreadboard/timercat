import {
	MonitorIcon,
	MoonIcon,
	RotateCcwIcon,
	Slider,
	SunIcon,
	Switch,
	ToggleGroup,
	TrashIcon,
	useConfirmDialog
} from '@repo/ui';
import { createFileRoute } from '@tanstack/react-router';
import { useFeatureState } from 'feature-react/state';
import React from 'react';
import { appConfig, specta } from '@/environment';
import {
	PermissionBadge,
	useAccessibilityPermission,
	useInputMonitoringPermission
} from '@/features/permission';
import {
	SettingGroup,
	SettingItem,
	SettingItemWarnDescription,
	useSettingsCx
} from '@/features/settings';
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

	const { trigger: triggerClearHistory, Dialog: ClearHistoryDialog } = useConfirmDialog({
		title: 'Clear history?',
		description:
			'All session and activity records will be permanently deleted. Focus profiles will not be affected.',
		confirmLabel: 'Clear history',
		onConfirm: () => {
			specta.commands.clearHistory();
		}
	});
	const { trigger: triggerResetSettings, Dialog: ResetSettingsDialog } = useConfirmDialog({
		title: 'Reset settings?',
		description: 'All settings will be restored to their defaults.',
		confirmLabel: 'Reset settings',
		onConfirm: () => {
			specta.commands.resetSettings();
		}
	});

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

	const updateSessionAudio = React.useCallback(
		(updates: Partial<specta.AudioChannelSettings>) => {
			settingsCx.update({
				audio: { ...settings.audio, session: { ...settings.audio.session, ...updates } }
			});
		},
		[settingsCx, settings.audio]
	);

	const updateSessionEndAudio = React.useCallback(
		(updates: Partial<specta.AudioChannelSettings>) => {
			settingsCx.update({
				audio: { ...settings.audio, sessionEnd: { ...settings.audio.sessionEnd, ...updates } }
			});
		},
		[settingsCx, settings.audio]
	);

	const updateEffectsAudio = React.useCallback(
		(updates: Partial<specta.AudioChannelSettings>) => {
			settingsCx.update({
				audio: { ...settings.audio, effects: { ...settings.audio.effects, ...updates } }
			});
		},
		[settingsCx, settings.audio]
	);

	// MARK: - UI

	return (
		<>
			<div className="space-y-6">
				<h1 className="text-base-900 text-xl font-semibold">App</h1>

				<SettingGroup title="General">
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
					<SettingItem
						label="Launch at login"
						description={
							isAppStore ? (
								<SettingItemWarnDescription
									text="Not available in App Store builds"
									url={appConfig.distribution.docsAppStore}
								/>
							) : (
								'Start FocusCat when you log in'
							)
						}
						disabled={isAppStore}
					>
						<Switch
							checked={isAppStore ? false : settings.launchAtLogin}
							onCheckedChange={(checked) =>
								!isAppStore && settingsCx.update({ launchAtLogin: checked })
							}
							size="sm"
							disabled={isAppStore}
						/>
					</SettingItem>
				</SettingGroup>

				<SettingGroup title="Audio">
					<SettingItem label="Session sound" description="Clock ticking during timer sessions">
						<Switch
							checked={settings.audio.session.enabled}
							onCheckedChange={(checked) => updateSessionAudio({ enabled: checked })}
							size="sm"
						/>
					</SettingItem>
					{settings.audio.session.enabled && (
						<SettingItem label="Volume">
							<div className="flex min-w-40 items-center gap-3">
								<span className="text-base-500 shrink-0 text-right text-xs tabular-nums">
									{Math.round(settings.audio.session.volume * 100)}%
								</span>
								<div className="min-w-0 flex-1">
									<Slider
										value={Math.round(settings.audio.session.volume * 100)}
										min={0}
										max={100}
										step={5}
										size="sm"
										aria-label="Session sound volume"
										onValueChange={(v) => updateSessionAudio({ volume: v / 100 })}
									/>
								</div>
							</div>
						</SettingItem>
					)}
					<SettingItem label="Session end sound" description="Chime when a session ends">
						<Switch
							checked={settings.audio.sessionEnd.enabled}
							onCheckedChange={(checked) => updateSessionEndAudio({ enabled: checked })}
							size="sm"
						/>
					</SettingItem>
					{settings.audio.sessionEnd.enabled && (
						<SettingItem label="Volume">
							<div className="flex min-w-40 items-center gap-3">
								<span className="text-base-500 shrink-0 text-right text-xs tabular-nums">
									{Math.round(settings.audio.sessionEnd.volume * 100)}%
								</span>
								<div className="min-w-0 flex-1">
									<Slider
										value={Math.round(settings.audio.sessionEnd.volume * 100)}
										min={0}
										max={100}
										step={5}
										size="sm"
										aria-label="Session end sound volume"
										onValueChange={(v) => updateSessionEndAudio({ volume: v / 100 })}
									/>
								</div>
							</div>
						</SettingItem>
					)}
					<SettingItem label="Sound effects" description="Cat meow and other widget sounds">
						<Switch
							checked={settings.audio.effects.enabled}
							onCheckedChange={(checked) => updateEffectsAudio({ enabled: checked })}
							size="sm"
						/>
					</SettingItem>
					{settings.audio.effects.enabled && (
						<SettingItem label="Volume">
							<div className="flex min-w-40 items-center gap-3">
								<span className="text-base-500 shrink-0 text-right text-xs tabular-nums">
									{Math.round(settings.audio.effects.volume * 100)}%
								</span>
								<div className="min-w-0 flex-1">
									<Slider
										value={Math.round(settings.audio.effects.volume * 100)}
										min={0}
										max={100}
										step={5}
										size="sm"
										aria-label="Sound effects volume"
										onValueChange={(v) => updateEffectsAudio({ volume: v / 100 })}
									/>
								</div>
							</div>
						</SettingItem>
					)}
				</SettingGroup>

				{!isAppStore && (
					<SettingGroup title="Permissions">
						<SettingItem
							variant="nav"
							label="Accessibility"
							description="Required for activity tracking"
							onClick={accessibility.openSettings}
						>
							<PermissionBadge status={accessibility.granted} />
						</SettingItem>
						<SettingItem
							variant="nav"
							label="Input Monitoring"
							description="Required for idle detection"
							onClick={inputMonitoring.openSettings}
						>
							<PermissionBadge status={inputMonitoring.granted} />
						</SettingItem>
					</SettingGroup>
				)}

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
							isAppStore ? (
								<SettingItemWarnDescription
									text="Not available in App Store builds"
									url={appConfig.distribution.docsAppStore}
								/>
							) : (
								'Floating cat companion window'
							)
						}
						disabled={isAppStore}
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

				<SettingGroup title="Data">
					<SettingItem
						variant="action"
						label="Clear History"
						description="Delete all session and activity records"
						onClick={triggerClearHistory}
					>
						<TrashIcon className="text-base-400 size-4" />
					</SettingItem>
					<SettingItem
						variant="action"
						label="Reset Settings"
						description="Restore all settings to their defaults"
						onClick={triggerResetSettings}
					>
						<RotateCcwIcon className="text-base-400 size-4" />
					</SettingItem>
				</SettingGroup>
			</div>

			<ClearHistoryDialog />
			<ResetSettingsDialog />
		</>
	);
}
