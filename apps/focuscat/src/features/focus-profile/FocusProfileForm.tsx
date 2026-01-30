import { type TFormFieldStatusValue } from 'feature-form';
import { useForm } from 'feature-react/form';
import { useCompute, useFeatureState } from 'feature-react/state';
import React from 'react';
import { AppWebsiteSelect, CheckIcon, Input, Switch, ToggleGroup } from '@/components';
import { type specta } from '@/environment';
import { SettingGroup, SettingItem } from '@/features/settings';
import { cn } from '@/lib';
import { useFocusProfileCx } from './FocusProfileCx';

export const FocusProfileForm: React.FC<TFocusProfileFormProps> = (props) => {
	const {
		presetColors = [
			{ label: 'Red', value: '#EF4444' },
			{ label: 'Yellow', value: '#F59E0B' },
			{ label: 'Green', value: '#10B981' },
			{ label: 'Blue', value: '#3B82F6' }
		],
		dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
	} = props;
	const profileCx = useFocusProfileCx();
	const { form, register, status } = useForm(profileCx.form);

	const color = useFeatureState(form.fields.color);
	const ruleEnabled = useCompute(form.fields.ruleEnabled, ({ value }) => value ?? false);
	const ruleMode = useFeatureState(form.fields.ruleMode);
	const ruleTargets = useFeatureState(form.fields.ruleTargets);
	const scheduleEnabled = useCompute(form.fields.scheduleEnabled, ({ value }) => value ?? false);
	const scheduleMode = useFeatureState(form.fields.scheduleMode);
	const scheduleDays = useFeatureState(form.fields.scheduleDays);
	const scheduleStartTime = useFeatureState(form.fields.scheduleStartTime);
	const scheduleEndTime = useFeatureState(form.fields.scheduleEndTime);
	const nameError = useCompute(status('name'), computeError);
	const colorError = useCompute(status('color'), computeError);

	const inputRef = React.useRef<HTMLInputElement>(null);

	// MARK: - Actions

	const handleColorClick = React.useCallback(
		(colorValue: string) => {
			form.fields.color.set(colorValue);
		},
		[form.fields.color]
	);

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

	// MARK: - Effects

	React.useEffect(() => {
		inputRef.current?.focus();
	}, []);

	// MARK: - UI

	return (
		<div className="space-y-6">
			<SettingGroup title="Details">
				<SettingItem
					label="Name"
					description={nameError ?? 'Give your profile a name'}
					className={cn(nameError != null && '[&_p]:text-red-500')}
				>
					<Input
						ref={inputRef}
						{...register('name', true)}
						placeholder="e.g. Deep Work, Study..."
						size="sm"
						className={cn('w-40', nameError != null && 'border-red-500')}
					/>
				</SettingItem>
				<SettingItem
					label="Color"
					description={colorError ?? 'Pick a color for your profile'}
					className={cn(colorError != null && '[&_p]:text-red-500')}
				>
					<div className="flex gap-2">
						{presetColors.map((preset) => (
							<button
								key={preset.value}
								type="button"
								onClick={() => handleColorClick(preset.value)}
								className="focus:ring-primary relative size-7 rounded-full transition-transform hover:scale-110 focus:ring-2 focus:ring-offset-2 focus:outline-none"
								style={{ backgroundColor: preset.value }}
								title={preset.label}
							>
								{color === preset.value && (
									<CheckIcon
										size={14}
										className="absolute inset-0 m-auto text-white"
										strokeWidth={3}
									/>
								)}
							</button>
						))}
					</div>
				</SettingItem>
			</SettingGroup>

			<SettingGroup title="Rules">
				<SettingItem
					label="Enable"
					description="Block or allow apps and websites when this profile is active"
				>
					<Switch
						checked={ruleEnabled}
						onCheckedChange={(checked) => form.fields.ruleEnabled.set(checked)}
						size="sm"
					/>
				</SettingItem>
				{ruleEnabled && (
					<>
						<SettingItem
							label="Mode"
							description={
								ruleMode === 'block'
									? 'Block selected apps & websites during focus'
									: 'Allow only selected apps & websites during focus'
							}
						>
							<ToggleGroup
								value={ruleMode}
								onValueChange={(value) => form.fields.ruleMode.set(value as specta.RuleAction)}
								size="sm"
							>
								<ToggleGroup.Item value="block" className="w-auto px-3 text-xs font-medium">
									Block
								</ToggleGroup.Item>
								<ToggleGroup.Item value="allow" className="w-auto px-3 text-xs font-medium">
									Allow Only
								</ToggleGroup.Item>
							</ToggleGroup>
						</SettingItem>
						<div className="flex flex-col gap-2 px-4 py-3">
							<div>
								<span className="text-base-900 text-sm font-medium">Apps & Websites</span>
								<p className="text-base-500 text-xs">
									{ruleMode === 'block'
										? 'Block these apps and websites during focus sessions'
										: 'Allow only these apps and websites during focus sessions'}
								</p>
							</div>
							<AppWebsiteSelect
								value={ruleTargets ?? []}
								onChange={(newItems) => form.fields.ruleTargets.set(newItems)}
								placeholder={
									ruleMode === 'block'
										? 'Add apps or websites to block...'
										: 'Add apps or websites to allow...'
								}
								popupSide="top"
							/>
						</div>
					</>
				)}
			</SettingGroup>

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
								onValueChange={(value) =>
									form.fields.scheduleMode.set(value as specta.ScheduleMode)
								}
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
		</div>
	);
};

interface TFocusProfileFormProps {
	presetColors?: { label: string; value: string }[];
	dayLabels?: string[];
}

function computeError(cx: { value: TFormFieldStatusValue }): string | null {
	return cx.value.type === 'INVALID' ? (cx.value.errors[0]?.message ?? null) : null;
}
