import { MonitorIcon, MoonIcon, Slider, SunIcon, Switch, ToggleGroup } from '@repo/ui';
import { useFeatureState } from 'feature-react/state';
import React from 'react';
import { SettingGroup, SettingItem, useSettingsCx, type TTheme } from '@/features/settings';

export const AppPanel: React.FC = () => {
	const settingsCx = useSettingsCx();
	const settings = useFeatureState(settingsCx.$appSettings);

	// MARK: - Actions

	const updateAppearance = React.useCallback(
		(updates: Partial<{ theme: TTheme }>) => {
			settingsCx.update({ appearance: { ...settings.appearance, ...updates } });
		},
		[settingsCx, settings.appearance]
	);

	const updateFeatures = React.useCallback(
		(updates: Partial<typeof settings.features>) => {
			settingsCx.update({ features: { ...settings.features, ...updates } });
		},
		[settingsCx, settings.features]
	);

	const updateAudio = React.useCallback(
		(updates: Partial<typeof settings.audio>) => {
			settingsCx.update({ audio: { ...settings.audio, ...updates } });
		},
		[settingsCx, settings.audio]
	);

	// MARK: - UI

	return (
		<div className="space-y-6">
			<h1 className="text-base-900 text-xl font-semibold">App</h1>

			<SettingGroup title="General">
				<SettingItem label="Theme" description="Choose your preferred color scheme">
					<ToggleGroup
						value={settings.appearance.theme}
						onValueChange={(theme) => updateAppearance({ theme: theme as TTheme })}
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

			<SettingGroup title="Features">
				<SettingItem label="Focus Goals" description="Track daily focus time targets">
					<Switch
						checked={settings.features.goals}
						onCheckedChange={(checked) => updateFeatures({ goals: checked })}
						size="sm"
					/>
				</SettingItem>
				<SettingItem label="Cat Widget" description="Floating cat companion window">
					<Switch
						checked={settings.features.catWindow}
						onCheckedChange={(checked) => updateFeatures({ catWindow: checked })}
						size="sm"
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
};
