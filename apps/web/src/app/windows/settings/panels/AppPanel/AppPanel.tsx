import { MonitorIcon, MoonIcon, Select, SunIcon, Switch, ToggleGroup } from '@repo/ui';
import { useFeatureState } from 'feature-react/state';
import React from 'react';
import { appBackgroundOrder, appBackgrounds } from '@/app/backgrounds';
import {
	SettingGroup,
	SettingItem,
	useSettingsCx,
	type TBackground,
	type TTheme
} from '@/features/settings';
import { AudioSettingGroup } from './AudioSettingGroup';

export const AppPanel: React.FC = () => {
	const settingsCx = useSettingsCx();
	const settings = useFeatureState(settingsCx.$appSettings);

	// MARK: - Actions

	const updateAppearance = React.useCallback(
		(updates: Partial<{ theme: TTheme; background: TBackground }>) => {
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
				<SettingItem label="Background" description="Choose the backdrop for your timer workspace">
					<Select
						items={appBackgroundOrder.map((background) => ({
							label: appBackgrounds[background].label,
							value: background,
							preview: (
								<div
									className={`border-base-200 h-5 w-8 shrink-0 rounded-sm border ${appBackgrounds[background].previewClassName}`}
									aria-hidden
								/>
							)
						}))}
						value={settings.appearance.background}
						onValueChange={(background) =>
							updateAppearance({ background: background as TBackground })
						}
						size="sm"
						className="min-w-40"
					/>
				</SettingItem>
			</SettingGroup>

			<AudioSettingGroup
				audio={settings.audio}
				onUpdate={(audio) => settingsCx.update({ audio })}
			/>

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
