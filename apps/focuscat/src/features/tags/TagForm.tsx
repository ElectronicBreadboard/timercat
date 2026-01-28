import { type TFormFieldStatusValue } from 'feature-form';
import { useForm } from 'feature-react/form';
import { useCompute, useFeatureState } from 'feature-react/state';
import React from 'react';
import { CheckIcon, Input } from '@/components';
import { SettingGroup, SettingItem } from '@/features/settings';
import { cn } from '@/lib';
import { useTagsCx } from './TagsCx';

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
		<SettingGroup>
			<SettingItem
				label="Name"
				description={nameError ?? 'Give your tag a name'}
				className={cn(nameError != null && '[&_p]:text-red-500')}
			>
				<Input
					ref={inputRef}
					{...register('name', true)}
					placeholder="e.g. Work, Study..."
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
	);
};

interface TTagForm {
	presetColors?: { label: string; value: string }[];
}

function computeError(cx: { value: TFormFieldStatusValue }): string | null {
	return cx.value.type === 'INVALID' ? (cx.value.errors[0]?.message ?? null) : null;
}
