import { CheckIcon, cn, Input } from '@repo/ui';
import { type TFormFieldStatusValue } from 'feature-form';
import { useForm } from 'feature-react/form';
import { useCompute, useFeatureState } from 'feature-react/state';
import React from 'react';
import { SettingGroup, SettingItem } from '@/features/settings';
import { useFocusProfileCx } from '../FocusProfileCx';
import { RuleSettingGroup } from './RuleSettingGroup';
import { ScheduleSettingGroup } from './ScheduleSettingGroup';

export const FocusProfileForm: React.FC<TFocusProfileFormProps> = (props) => {
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
				<div data-field="name">
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
				</div>
				<div data-field="color">
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
				</div>
			</SettingGroup>

			<RuleSettingGroup form={form} />
			<ScheduleSettingGroup form={form} />
		</div>
	);
};

interface TFocusProfileFormProps {
	presetColors?: { label: string; value: string }[];
}

function computeError(cx: { value: TFormFieldStatusValue }): string | null {
	return cx.value.type === 'INVALID' ? (cx.value.errors[0]?.message ?? null) : null;
}
