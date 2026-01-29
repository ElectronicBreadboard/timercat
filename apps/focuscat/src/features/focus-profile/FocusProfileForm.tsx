import { type TFormFieldStatusValue } from 'feature-form';
import { useForm } from 'feature-react/form';
import { useCompute, useFeatureState } from 'feature-react/state';
import React from 'react';
import { AppWebsiteSelect, CheckIcon, Input, Switch, ToggleGroup } from '@/components';
import { type specta } from '@/environment';
import { SettingGroup, SettingItem } from '@/features/settings';
import { cn } from '@/lib';
import { useFocusProfileCx } from './FocusProfileCx';

export const FocusProfileForm: React.FC<TFocusProfileForm> = (props) => {
	const {
		presetColors = [
			{ label: 'Red', value: '#EF4444' },
			{ label: 'Yellow', value: '#F59E0B' },
			{ label: 'Green', value: '#10B981' },
			{ label: 'Blue', value: '#3B82F6' }
		]
	} = props;
	const profileCx = useFocusProfileCx();
	const { form, register, status } = useForm(profileCx.form);

	const color = useFeatureState(form.fields.color);
	const rulesEnabled = useCompute(form.fields.rulesEnabled, ({ value }) => value ?? false);
	const mode = useFeatureState(form.fields.mode);
	const targets = useFeatureState(form.fields.targets);
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
						checked={rulesEnabled}
						onCheckedChange={(checked) => form.fields.rulesEnabled.set(checked)}
						size="sm"
					/>
				</SettingItem>
				{rulesEnabled && (
					<>
						<SettingItem
							label="Mode"
							description={
								mode === 'block'
									? 'Block selected apps & websites during focus'
									: 'Allow only selected apps & websites during focus'
							}
						>
							<ToggleGroup
								value={mode}
								onValueChange={(value) => form.fields.mode.set(value as specta.RuleAction)}
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
									{mode === 'block'
										? 'Block these apps and websites during focus sessions'
										: 'Allow only these apps and websites during focus sessions'}
								</p>
							</div>
							<AppWebsiteSelect
								value={targets ?? []}
								onChange={(newItems) => form.fields.targets.set(newItems)}
								placeholder={
									mode === 'block'
										? 'Add apps or websites to block...'
										: 'Add apps or websites to allow...'
								}
								popupSide="top"
							/>
						</div>
					</>
				)}
			</SettingGroup>
		</div>
	);
};

interface TFocusProfileForm {
	presetColors?: { label: string; value: string }[];
}

function computeError(cx: { value: TFormFieldStatusValue }): string | null {
	return cx.value.type === 'INVALID' ? (cx.value.errors[0]?.message ?? null) : null;
}
