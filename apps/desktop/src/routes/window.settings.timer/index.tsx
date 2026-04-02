import { NumberField, Select, Switch, useConfirmDialog } from '@repo/ui';
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
	const timerMode = settings.timer.timerMode;

	const pendingMode = React.useRef<specta.TimerModeEnum | null>(null);
	const { trigger: triggerModeSwitch, Dialog: ModeSwitchDialog } = useConfirmDialog({
		title: 'Switch timer mode?',
		description:
			'You have an active timer. Switching modes will reset it and your current session will be cancelled.',
		confirmLabel: 'Switch anyway',
		cancelLabel: 'Keep current',
		onConfirm: async () => {
			if (pendingMode.current != null) {
				await applyModeSwitch(pendingMode.current);
			}
		}
	});

	// MARK: - Actions

	const updateTimer = React.useCallback(
		(updates: Partial<specta.TimerSettings>) => {
			settingsCx.update({ timer: { ...settings.timer, ...updates } });
		},
		[settingsCx, settings.timer]
	);

	const applyModeSwitch = React.useCallback(
		async (mode: specta.TimerModeEnum) => {
			await specta.commands.resetTimer();
			updateTimer({ timerMode: mode });
		},
		[updateTimer]
	);

	const handleModeChange = React.useCallback(
		async (value: string) => {
			const mode = value as specta.TimerModeEnum;
			if (mode === settings.timer.timerMode) return;

			const timer = specta.commands.getTimer();
			const isActive = (await timer).status !== 'idle';

			if (isActive) {
				pendingMode.current = mode;
				triggerModeSwitch();
			} else {
				await applyModeSwitch(mode);
			}
		},
		[settings.timer.timerMode, applyModeSwitch, triggerModeSwitch]
	);

	// MARK: - UI

	return (
		<>
			<div className="space-y-6">
				<h1 className="text-base-900 text-xl font-semibold">Timer</h1>

				<SettingGroup title="Mode">
					<SettingItem label="Timer Mode" description="Choose timer behavior">
						<Select
							items={React.useMemo(
								() => [
									{ label: 'Pomodoro', value: 'pomodoro' },
									{ label: 'Progressive', value: 'progressive' },
									{ label: 'Countdown', value: 'countdown' }
								],
								[]
							)}
							value={timerMode}
							onValueChange={(value) => handleModeChange(value as string)}
							size="sm"
						/>
					</SettingItem>
				</SettingGroup>

				{timerMode === 'countdown' && (
					<>
						<SettingGroup title="Durations">
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
						</SettingGroup>

						<SettingGroup title="Sessions">
							<SettingItem
								label="Show Session Setup"
								description="Show intention and profile selection before starting a session"
							>
								<Switch
									checked={settings.timer.countdown.showSessionSetup}
									onCheckedChange={(checked) =>
										updateTimer({
											countdown: {
												...settings.timer.countdown,
												showSessionSetup: checked
											}
										})
									}
									size="sm"
								/>
							</SettingItem>
						</SettingGroup>
					</>
				)}

				{timerMode === 'pomodoro' && (
					<>
						<SettingGroup title="Durations">
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
									min={1}
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
						</SettingGroup>

						<SettingGroup title="Sessions">
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
								description="Go to next phase automatically when timer ends"
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
							{settings.timer.pomodoro.autoAdvance && (
								<SettingItem
									label="Auto-advance countdown"
									description="Seconds to show before going to next phase"
								>
									<NumberField
										value={settings.timer.pomodoro.autoAdvanceCountdownSeconds}
										min={5}
										max={30}
										step={5}
										size="sm"
										onChange={(v) =>
											updateTimer({
												pomodoro: {
													...settings.timer.pomodoro,
													autoAdvanceCountdownSeconds: v
												}
											})
										}
									/>
								</SettingItem>
							)}
							<SettingItem
								label="Show Session Setup"
								description="Show intention and profile selection before starting a session"
							>
								<Switch
									checked={settings.timer.pomodoro.showSessionSetup}
									onCheckedChange={(checked) =>
										updateTimer({
											pomodoro: { ...settings.timer.pomodoro, showSessionSetup: checked }
										})
									}
									size="sm"
								/>
							</SettingItem>
						</SettingGroup>
					</>
				)}

				{timerMode === 'progressive' && (
					<SettingGroup title="Sessions">
						<SettingItem
							label="Auto-advance"
							description="Go to next phase automatically when timer ends"
						>
							<Switch
								checked={settings.timer.progressive.autoAdvance ?? false}
								onCheckedChange={(checked) =>
									updateTimer({
										progressive: { ...settings.timer.progressive, autoAdvance: checked }
									})
								}
								size="sm"
							/>
						</SettingItem>
						{settings.timer.progressive.autoAdvance && (
							<SettingItem
								label="Auto-advance countdown"
								description="Seconds to show before going to next phase"
							>
								<NumberField
									value={settings.timer.progressive.autoAdvanceCountdownSeconds}
									min={5}
									max={30}
									step={5}
									size="sm"
									onChange={(v) =>
										updateTimer({
											progressive: {
												...settings.timer.progressive,
												autoAdvanceCountdownSeconds: v
											}
										})
									}
								/>
							</SettingItem>
						)}
						<SettingItem
							label="Show Session Setup"
							description="Show intention and profile selection before starting a session"
						>
							<Switch
								checked={settings.timer.progressive.showSessionSetup}
								onCheckedChange={(checked) =>
									updateTimer({
										progressive: {
											...settings.timer.progressive,
											showSessionSetup: checked
										}
									})
								}
								size="sm"
							/>
						</SettingItem>
					</SettingGroup>
				)}
			</div>

			<ModeSwitchDialog />
		</>
	);
}
