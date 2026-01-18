import { createFileRoute } from '@tanstack/react-router';
import { useFeatureState } from 'feature-react/state';
import React from 'react';
import {
	MonitorIcon,
	MoonIcon,
	NumberStepper,
	SegmentedControl,
	SettingGroup,
	SettingItem,
	SunIcon
} from '@/components';
import { specta } from '@/environment';
import { PermissionBadge, useAccessibilityPermission } from '@/features/permission';
import { useSettingsCx } from '@/features/settings';

export const Route = createFileRoute('/window/settings/general/')({
	component: RouteComponent
});

function RouteComponent() {
	const settingsCx = useSettingsCx();
	const settings = useFeatureState(settingsCx.$appSettings);
	const accessibility = useAccessibilityPermission();

	// MARK: - Actions

	const updateTimer = React.useCallback(
		(updates: Partial<specta.TimerSettings>) => {
			settingsCx.update({ timer: { ...settings.timer, ...updates } });
		},
		[settingsCx, settings.timer]
	);

	const updateFocusGoal = React.useCallback(
		(updates: Partial<specta.FocusGoalSettings>) => {
			settingsCx.update({ focusGoal: { ...settings.focusGoal, ...updates } });
		},
		[settingsCx, settings.focusGoal]
	);

	const updateAppearance = React.useCallback(
		(updates: Partial<specta.AppearanceSettings>) => {
			settingsCx.update({ appearance: { ...settings.appearance, ...updates } });
		},
		[settingsCx, settings.appearance]
	);

	// MARK: - UI

	return (
		<div className="space-y-6">
			<h1 className="text-base-900 text-xl font-semibold">General</h1>

			<SettingGroup title="Timer">
				<SettingItem label="Work Duration" description="Minutes per work session">
					<NumberStepper
						value={settings.timer.workDurationMinutes}
						min={5}
						max={120}
						step={5}
						onChange={(v) => updateTimer({ workDurationMinutes: v })}
					/>
				</SettingItem>
				<SettingItem label="Short Break" description="Minutes for short breaks">
					<NumberStepper
						value={settings.timer.shortBreakMinutes}
						min={5}
						max={60}
						step={5}
						onChange={(v) => updateTimer({ shortBreakMinutes: v })}
					/>
				</SettingItem>
				<SettingItem label="Long Break" description="Minutes for long breaks">
					<NumberStepper
						value={settings.timer.longBreakMinutes}
						min={5}
						max={60}
						step={5}
						onChange={(v) => updateTimer({ longBreakMinutes: v })}
					/>
				</SettingItem>
				<SettingItem
					label="Sessions Before Long Break"
					description="Work sessions before a long break"
				>
					<NumberStepper
						value={settings.timer.sessionsBeforeLongBreak}
						min={1}
						max={10}
						onChange={(v) => updateTimer({ sessionsBeforeLongBreak: v })}
					/>
				</SettingItem>
			</SettingGroup>

			<SettingGroup title="Focus Goal">
				<SettingItem label="Daily Goal" description="Target focus hours per day">
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

			<SettingGroup title="Appearance">
				<SettingItem label="Theme" description="Choose your preferred color scheme">
					<SegmentedControl
						value={settings.appearance.theme}
						onChange={(theme) => updateAppearance({ theme })}
						options={[
							{ value: 'light', label: <SunIcon size={16} />, ariaLabel: 'Light theme' },
							{ value: 'auto', label: <MonitorIcon size={16} />, ariaLabel: 'Auto theme' },
							{ value: 'dark', label: <MoonIcon size={16} />, ariaLabel: 'Dark theme' }
						]}
					/>
				</SettingItem>
			</SettingGroup>
		</div>
	);
}
