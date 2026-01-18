import { createFileRoute } from '@tanstack/react-router';
import { useFeatureState } from 'feature-react/state';
import React from 'react';
import { NumberStepper, SettingGroup, SettingItem } from '@/components';
import { specta } from '@/environment';
import { useSettingsCx } from '@/features/settings';

export const Route = createFileRoute('/window/settings/goals/')({
	component: RouteComponent
});

function RouteComponent() {
	const settingsCx = useSettingsCx();
	const settings = useFeatureState(settingsCx.$appSettings);

	// MARK: - Actions

	const updateFocusGoal = React.useCallback(
		(updates: Partial<specta.FocusGoalSettings>) => {
			settingsCx.update({ focusGoal: { ...settings.focusGoal, ...updates } });
		},
		[settingsCx, settings.focusGoal]
	);

	// MARK: - UI

	return (
		<div className="space-y-6">
			<h1 className="text-base-900 text-xl font-semibold">Goals</h1>

			<SettingGroup title="Daily">
				<SettingItem label="Focus Goal" description="Target focus hours per day">
					<NumberStepper
						value={settings.focusGoal.dailyGoalMinutes / 60}
						min={0.5}
						max={12}
						step={0.5}
						formatValue={(v) => `${v}h`}
						onChange={(v) => updateFocusGoal({ dailyGoalMinutes: v * 60 })}
					/>
				</SettingItem>
			</SettingGroup>
		</div>
	);
}
