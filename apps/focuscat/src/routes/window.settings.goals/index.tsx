import { createFileRoute } from '@tanstack/react-router';
import { useFeatureState } from 'feature-react/state';
import React from 'react';
import { NumberField } from '@/components';
import { specta } from '@/environment';
import { SettingGroup, SettingItem, useSettingsCx } from '@/features/settings';

export const Route = createFileRoute('/window/settings/goals/')({
	component: RouteComponent
});

function RouteComponent() {
	const settingsCx = useSettingsCx();
	const settings = useFeatureState(settingsCx.$appSettings);

	// MARK: - Actions

	const updateGoals = React.useCallback(
		(updates: Partial<specta.GoalSettings>) => {
			settingsCx.update({ goals: { ...settings.goals, ...updates } });
		},
		[settingsCx, settings.goals]
	);

	// MARK: - UI

	return (
		<div className="space-y-6">
			<h1 className="text-base-900 text-xl font-semibold">Goals</h1>

			<SettingGroup title="Daily">
				<SettingItem label="Focus Goal" description="Target focus hours per day">
					<NumberField
						value={settings.goals.dailyGoalMinutes / 60}
						min={0.5}
						max={12}
						step={0.5}
						size="sm"
						onChange={(v) => updateGoals({ dailyGoalMinutes: v * 60 })}
					/>
				</SettingItem>
			</SettingGroup>
		</div>
	);
}
