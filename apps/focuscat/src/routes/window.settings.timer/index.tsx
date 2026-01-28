import { createFileRoute } from '@tanstack/react-router';
import { useFeatureState } from 'feature-react/state';
import React from 'react';
import { NumberField } from '@/components';
import { specta } from '@/environment';
import { SettingGroup, SettingItem, useSettingsCx } from '@/features/settings';

export const Route = createFileRoute('/window/settings/timer/')({
	component: RouteComponent
});

function RouteComponent() {
	const settingsCx = useSettingsCx();
	const settings = useFeatureState(settingsCx.$appSettings);

	// MARK: - Actions

	const updateTimer = React.useCallback(
		(updates: Partial<specta.TimerSettings>) => {
			settingsCx.update({ timer: { ...settings.timer, ...updates } });
		},
		[settingsCx, settings.timer]
	);

	// MARK: - UI

	return (
		<div className="space-y-6">
			<h1 className="text-base-900 text-xl font-semibold">Timer</h1>

			<SettingGroup title="Durations">
				<SettingItem label="Work Duration" description="Minutes per work session">
					<NumberField
						value={settings.timer.workDurationMinutes}
						min={5}
						max={120}
						step={5}
						onChange={(v) => updateTimer({ workDurationMinutes: v })}
					/>
				</SettingItem>
				<SettingItem label="Short Break" description="Minutes for short breaks">
					<NumberField
						value={settings.timer.shortBreakMinutes}
						min={5}
						max={60}
						step={5}
						onChange={(v) => updateTimer({ shortBreakMinutes: v })}
					/>
				</SettingItem>
				<SettingItem label="Long Break" description="Minutes for long breaks">
					<NumberField
						value={settings.timer.longBreakMinutes}
						min={5}
						max={60}
						step={5}
						onChange={(v) => updateTimer({ longBreakMinutes: v })}
					/>
				</SettingItem>
			</SettingGroup>

			<SettingGroup title="Sessions">
				<SettingItem
					label="Sessions Before Long Break"
					description="Work sessions before a long break"
				>
					<NumberField
						value={settings.timer.sessionsBeforeLongBreak}
						min={1}
						max={10}
						onChange={(v) => updateTimer({ sessionsBeforeLongBreak: v })}
					/>
				</SettingItem>
			</SettingGroup>
		</div>
	);
}
