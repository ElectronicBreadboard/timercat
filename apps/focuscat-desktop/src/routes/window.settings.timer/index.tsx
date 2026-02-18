import { NumberField, Switch, ToggleGroup } from '@repo/ui';
import { createFileRoute } from '@tanstack/react-router';
import { useFeatureState } from 'feature-react/state';
import React from 'react';
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

			<SettingGroup title="Mode">
				<SettingItem label="Timer Mode" description="Choose timer behavior">
					<ToggleGroup
						value={settings.timer.timerMode}
						onValueChange={(v) => updateTimer({ timerMode: v as specta.TimerModeEnum })}
						size="sm"
					>
						<ToggleGroup.Item value="pomodoro" className="w-auto px-3 text-xs font-medium">
							Pomodoro
						</ToggleGroup.Item>
						<ToggleGroup.Item value="countdown" className="w-auto px-3 text-xs font-medium">
							Countdown
						</ToggleGroup.Item>
					</ToggleGroup>
				</SettingItem>
			</SettingGroup>

			<SettingGroup title="Durations">
				{settings.timer.timerMode === 'countdown' ? (
					<SettingItem label="Duration" description="Minutes for countdown">
						<NumberField
							value={settings.timer.countdown.durationMinutes}
							min={1}
							max={120}
							step={5}
							size="sm"
							onChange={(v) =>
								updateTimer({
									countdown: { ...settings.timer.countdown, durationMinutes: v }
								})
							}
						/>
					</SettingItem>
				) : (
					<>
						<SettingItem label="Work Duration" description="Minutes per work session">
							<NumberField
								value={settings.timer.pomodoro.workDurationMinutes}
								min={5}
								max={120}
								step={5}
								size="sm"
								onChange={(v) =>
									updateTimer({
										pomodoro: { ...settings.timer.pomodoro, workDurationMinutes: v }
									})
								}
							/>
						</SettingItem>
						<SettingItem label="Short Break" description="Minutes for short breaks">
							<NumberField
								value={settings.timer.pomodoro.shortBreakMinutes}
								min={5}
								max={60}
								step={5}
								size="sm"
								onChange={(v) =>
									updateTimer({
										pomodoro: { ...settings.timer.pomodoro, shortBreakMinutes: v }
									})
								}
							/>
						</SettingItem>
						<SettingItem label="Long Break" description="Minutes for long breaks">
							<NumberField
								value={settings.timer.pomodoro.longBreakMinutes}
								min={5}
								max={60}
								step={5}
								size="sm"
								onChange={(v) =>
									updateTimer({
										pomodoro: { ...settings.timer.pomodoro, longBreakMinutes: v }
									})
								}
							/>
						</SettingItem>
					</>
				)}
			</SettingGroup>

			<SettingGroup title="Sessions">
				{settings.timer.timerMode === 'pomodoro' && (
					<>
						<SettingItem
							label="Sessions Before Long Break"
							description="Work sessions before a long break"
						>
							<NumberField
								value={settings.timer.pomodoro.sessionsBeforeLongBreak}
								min={1}
								max={10}
								size="sm"
								onChange={(v) =>
									updateTimer({
										pomodoro: { ...settings.timer.pomodoro, sessionsBeforeLongBreak: v }
									})
								}
							/>
						</SettingItem>
						<SettingItem
							label="Auto-advance"
							description="Go to next phase automatically when timer ends (no overtime)"
						>
							<Switch
								checked={settings.timer.pomodoro.autoAdvance ?? false}
								onCheckedChange={(checked) =>
									updateTimer({
										pomodoro: { ...settings.timer.pomodoro, autoAdvance: checked }
									})
								}
								size="sm"
							/>
						</SettingItem>
					</>
				)}
				<SettingItem
					label="Show Session Setup"
					description="Show intention and profile selection before starting a session"
				>
					<Switch
						checked={settings.timer.showSessionSetup}
						onCheckedChange={(checked) => updateTimer({ showSessionSetup: checked })}
						size="sm"
					/>
				</SettingItem>
			</SettingGroup>
		</div>
	);
}
