import { type TFormFieldStatusValue } from 'feature-form';
import { useForm } from 'feature-react/form';
import { useCompute, useFeatureState } from 'feature-react/state';
import React from 'react';
import { AppWebsiteSelect, CheckIcon, Input, Switch, ToggleGroup } from '@/components';
import { SettingGroup, SettingItem } from '@/features/settings';
import { cn } from '@/lib';
import { useTagsCx, type TRestrictionMode } from './TagsCx';

export const TagForm: React.FC<TTagForm> = (props) => {
	const {
		presetColors = [
			{ label: 'Red', value: '#EF4444' },
			{ label: 'Yellow', value: '#F59E0B' },
			{ label: 'Green', value: '#10B981' },
			{ label: 'Blue', value: '#3B82F6' }
		]
	} = props;
	const tagsCx = useTagsCx();
	const { form, register, status } = useForm(tagsCx.form);

	const color = useFeatureState(form.fields.color);
	const restrictionsEnabled = useCompute(
		form.fields.restrictionsEnabled,
		({ value }) => value ?? false
	);
	const mode = useFeatureState(form.fields.restrictionsMode);
	const items = useFeatureState(form.fields.restrictions);
	const nameError = useCompute(status('name'), computeError);
	const colorError = useCompute(status('color'), computeError);

	const inputRef = React.useRef<HTMLInputElement>(null);

	const handleColorClick = React.useCallback(
		(colorValue: string) => {
			form.fields.color.set(colorValue);
		},
		[form.fields.color]
	);

	React.useEffect(() => {
		inputRef.current?.focus();
	}, []);

	return (
		<div className="space-y-6">
			<SettingGroup title="Details">
				<SettingItem
					label="Name"
					description={nameError ?? 'Give your tag a name'}
					className={cn(nameError != null && '[&_p]:text-red-500')}
				>
					<Input
						ref={inputRef}
						{...register('name', true)}
						placeholder="e.g. Work, Study..."
						size="sm"
						className={cn('w-40', nameError != null && 'border-red-500')}
					/>
				</SettingItem>
				<SettingItem
					label="Color"
					description={colorError ?? 'Pick a color for your tag'}
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

			<SettingGroup title="Restrictions">
				<SettingItem
					label="Enable"
					description="Restrict apps and websites when this tag is active"
				>
					<Switch
						checked={restrictionsEnabled}
						onCheckedChange={(checked) => form.fields.restrictionsEnabled.set(checked)}
						size="sm"
					/>
				</SettingItem>
				{restrictionsEnabled && (
					<>
						<SettingItem
							label="Mode"
							description={
								mode === 'block'
									? 'Block selected apps & websites'
									: 'Allow only selected apps & websites'
							}
						>
							<ToggleGroup
								value={mode}
								onValueChange={(value) =>
									form.fields.restrictionsMode.set(value as TRestrictionMode)
								}
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
										? 'Block these apps and websites when this tag is active'
										: 'Allow only these apps and websites when this tag is active'}
								</p>
							</div>
							<AppWebsiteSelect
								value={items ?? []}
								onChange={(newItems) => form.fields.restrictions.set(newItems)}
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

interface TTagForm {
	presetColors?: { label: string; value: string }[];
}

function computeError(cx: { value: TFormFieldStatusValue }): string | null {
	return cx.value.type === 'INVALID' ? (cx.value.errors[0]?.message ?? null) : null;
}
