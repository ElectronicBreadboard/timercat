import { type TForm } from 'feature-form';
import { useCompute, useFeatureState } from 'feature-react/state';
import React from 'react';
import { Input, Switch, ToggleGroup } from '@/components';
import { type specta } from '@/environment';
import { SettingGroup, SettingItem } from '@/features/settings';
import { cn } from '@/lib';
import { type TFocusProfileFormData } from '../FocusProfileCx';

export const ScheduleSettingGroup: React.FC<TScheduleSettingGroupProps> = (props) => {
	const { form, dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] } = props;

	const scheduleEnabled = useCompute(form.fields.scheduleEnabled, ({ value }) => value ?? false);
	const scheduleMode = useFeatureState(form.fields.scheduleMode);
	const scheduleDays = useFeatureState(form.fields.scheduleDays);
	const scheduleStartTime = useFeatureState(form.fields.scheduleStartTime);
	const scheduleEndTime = useFeatureState(form.fields.scheduleEndTime);

	// MARK: - Actions

	const handleDayToggle = React.useCallback(
		(day: number) => {
			const current = form.fields.scheduleDays.get() ?? [];
			const next = current.includes(day)
				? current.filter((d) => d !== day)
				: [...current, day].sort((a, b) => a - b);
			form.fields.scheduleDays.set(next);
		},
		[form.fields.scheduleDays]
	);

	// MARK: - UI

	return (
		<SettingGroup title="Schedule">
			<SettingItem label="Enable" description="Automatically activate this profile on a schedule">
				<Switch
					checked={scheduleEnabled}
					onCheckedChange={(checked) => form.fields.scheduleEnabled.set(checked)}
					size="sm"
				/>
			</SettingItem>
			{scheduleEnabled && (
				<>
					<SettingItem
						label="Mode"
						description={
							scheduleMode === 'always_on'
								? 'Rules apply continuously during scheduled times'
								: 'Auto-selected when starting a session during scheduled times'
						}
					>
						<ToggleGroup
							value={scheduleMode}
							onValueChange={(value) => form.fields.scheduleMode.set(value as specta.ScheduleMode)}
							size="sm"
						>
							<ToggleGroup.Item value="always_on" className="w-auto px-3 text-xs font-medium">
								Always On
							</ToggleGroup.Item>
							<ToggleGroup.Item value="sessions_only" className="w-auto px-3 text-xs font-medium">
								Sessions Only
							</ToggleGroup.Item>
						</ToggleGroup>
					</SettingItem>
					<SettingItem label="Days" description="Which days the schedule is active">
						<div className="flex gap-1">
							{dayLabels.map((label, index) => (
								<button
									key={index}
									type="button"
									onClick={() => handleDayToggle(index)}
									className={cn(
										'flex size-7 items-center justify-center rounded-full text-xs font-medium transition-colors',
										(scheduleDays ?? []).includes(index)
											? 'bg-primary text-white'
											: 'bg-base-100 text-base-500 hover:bg-base-200'
									)}
								>
									{label}
								</button>
							))}
						</div>
					</SettingItem>
					<SettingItem label="Time" description="Start and end time for the schedule">
						<div className="flex items-center gap-2">
							<Input
								type="time"
								value={scheduleStartTime}
								onChange={(e) => form.fields.scheduleStartTime.set(e.target.value)}
								size="sm"
								className="w-28"
							/>
							<span className="text-base-400 text-xs">–</span>
							<Input
								type="time"
								value={scheduleEndTime}
								onChange={(e) => form.fields.scheduleEndTime.set(e.target.value)}
								size="sm"
								className="w-28"
							/>
						</div>
					</SettingItem>
				</>
			)}
		</SettingGroup>
	);
};

interface TScheduleSettingGroupProps {
	form: TForm<TFocusProfileFormData, []>;
	dayLabels?: string[];
}
