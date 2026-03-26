import { Switch } from '@repo/ui';
import { useFeatureState } from 'feature-react/state';
import React from 'react';
import { SettingGroup, SettingItem, useSettingsCx, type TAppSettings } from '@/features/settings';

const TIMER_SPEEDS = [1, 2, 5, 10, 60, 120] as const;

export const DeveloperPanel: React.FC = () => {
	const settingsCx = useSettingsCx();
	const settings = useFeatureState(settingsCx.$appSettings);

	// MARK: - Actions

	const updateDeveloper = React.useCallback(
		(updates: Partial<TAppSettings['developer']>) => {
			settingsCx.update({ developer: { ...settings.developer, ...updates } });
		},
		[settingsCx, settings.developer]
	);

	const cycleTimerSpeed = React.useCallback(() => {
		const currentIndex = TIMER_SPEEDS.indexOf(
			settings.developer.timerSpeed as (typeof TIMER_SPEEDS)[number]
		);
		const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % TIMER_SPEEDS.length;
		updateDeveloper({ timerSpeed: TIMER_SPEEDS[nextIndex] });
	}, [settings.developer.timerSpeed, updateDeveloper]);

	// MARK: - UI

	return (
		<div className="space-y-6">
			<h1 className="text-base-900 text-xl font-semibold">Developer</h1>

			<SettingGroup title="Timer">
				<SettingItem
					variant="action"
					label="Timer Speed"
					description="Speed up timer for testing"
					onClick={cycleTimerSpeed}
				>
					<span className="text-base-500 font-mono text-sm">{settings.developer.timerSpeed}x</span>
				</SettingItem>
			</SettingGroup>

			<SettingGroup title="Cat">
				<SettingItem label="Cat debug" description="Show debug borders on cat window">
					<Switch
						checked={settings.developer.cat}
						onCheckedChange={(checked) => updateDeveloper({ cat: checked })}
						size="sm"
					/>
				</SettingItem>
			</SettingGroup>
		</div>
	);
};
