import { NumberField as BaseNumberField } from '@base-ui/react/number-field';
import { cva, type VariantProps } from 'class-variance-authority';
import React from 'react';
import { MinusIcon, PlusIcon } from '@/components/display';
import { cn } from '@/lib';

const numberFieldButtonVariants = cva(
	[
		'flex items-center justify-center border border-base-200 select-none',
		'bg-base-100 text-base-600 transition-colors duration-100',
		'hover:bg-base-200 hover:text-base-900',
		'active:bg-base-300',
		'outline-none focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-primary',
		'disabled:cursor-not-allowed disabled:opacity-50'
	],
	{
		variants: {
			size: {
				sm: 'size-7',
				md: 'size-8'
			}
		},
		defaultVariants: {
			size: 'md'
		}
	}
);

const numberFieldInputVariants = cva(
	[
		'border-y border-base-200 bg-transparent',
		'text-center font-mono text-base-900 tabular-nums',
		'outline-none focus:z-10 focus:ring-2 focus:ring-primary focus:-ring-offset-1'
	],
	{
		variants: {
			size: {
				sm: 'h-7 w-10 text-xs',
				md: 'h-8 w-12 text-sm'
			}
		},
		defaultVariants: {
			size: 'md'
		}
	}
);

export const NumberField: React.FC<TNumberFieldProps> = (props) => {
	const { value, onChange, min, max, step = 1, disabled = false, size, className } = props;

	return (
		<BaseNumberField.Root
			value={value}
			onValueChange={(val) => {
				if (val != null) {
					onChange(val);
				}
			}}
			min={min}
			max={max}
			step={step}
			disabled={disabled}
			className={className}
		>
			<BaseNumberField.Group className="flex">
				<BaseNumberField.Decrement
					className={cn(numberFieldButtonVariants({ size }), 'rounded-l-md')}
				>
					<MinusIcon size={size === 'sm' ? 12 : 14} />
				</BaseNumberField.Decrement>
				<BaseNumberField.Input className={numberFieldInputVariants({ size })} />
				<BaseNumberField.Increment
					className={cn(numberFieldButtonVariants({ size }), 'rounded-r-md')}
				>
					<PlusIcon size={size === 'sm' ? 12 : 14} />
				</BaseNumberField.Increment>
			</BaseNumberField.Group>
		</BaseNumberField.Root>
	);
};

export interface TNumberFieldProps extends VariantProps<typeof numberFieldButtonVariants> {
	value: number;
	onChange: (value: number) => void;
	min?: number;
	max?: number;
	step?: number;
	disabled?: boolean;
	className?: string;
}
