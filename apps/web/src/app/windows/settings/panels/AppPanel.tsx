import { MonitorIcon, MoonIcon, Select, Slider, SunIcon, Switch, ToggleGroup } from '@repo/ui';
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

	const updateSessionAudio = React.useCallback(
		(updates: Partial<typeof settings.audio.session>) => {
			settingsCx.update({
				audio: { ...settings.audio, session: { ...settings.audio.session, ...updates } }
			});
		},
		[settingsCx, settings.audio]
	);

	const updateSessionEndAudio = React.useCallback(
		(updates: Partial<typeof settings.audio.sessionEnd>) => {
			settingsCx.update({
				audio: { ...settings.audio, sessionEnd: { ...settings.audio.sessionEnd, ...updates } }
			});
		},
		[settingsCx, settings.audio]
	);

	const updateEffectsAudio = React.useCallback(
		(updates: Partial<typeof settings.audio.effects>) => {
			settingsCx.update({
				audio: { ...settings.audio, effects: { ...settings.audio.effects, ...updates } }
			});
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
