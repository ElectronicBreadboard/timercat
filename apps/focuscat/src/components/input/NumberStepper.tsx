import React from 'react';
import { MinusIcon, PlusIcon } from '@/components/display';
import { cn } from '@/lib';

export const NumberStepper: React.FC<TNumberStepperProps> = (props) => {
	const {
		value,
		onChange,
		min = 0,
		max = 100,
		step = 1,
		disabled = false,
		formatValue,
		className
	} = props;

	const handleDecrement = React.useCallback(() => {
		if (value > min) {
			onChange(Math.max(min, value - step));
		}
	}, [value, min, step, onChange]);

	const handleIncrement = React.useCallback(() => {
		if (value < max) {
			onChange(Math.min(max, value + step));
		}
	}, [value, max, step, onChange]);

	const buttonClasses = cn(
		'flex size-8 items-center justify-center rounded-full',
		'bg-gray-100 text-gray-600 transition-colors duration-100',
		'hover:bg-gray-200 hover:text-gray-900',
		'active:bg-gray-300',
		'outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
		'disabled:cursor-not-allowed disabled:opacity-50'
	);

	return (
		<div className={cn('flex items-center gap-2', className)}>
			<button
				type="button"
				onClick={handleDecrement}
				disabled={disabled || value <= min}
				className={buttonClasses}
			>
				<MinusIcon size={14} />
			</button>
			<span className="min-w-8 text-center font-mono text-sm tabular-nums text-gray-900">
				{formatValue != null ? formatValue(value) : value}
			</span>
			<button
				type="button"
				onClick={handleIncrement}
				disabled={disabled || value >= max}
				className={buttonClasses}
			>
				<PlusIcon size={14} />
			</button>
		</div>
	);
};

export interface TNumberStepperProps {
	value: number;
	onChange: (value: number) => void;
	min?: number;
	max?: number;
	step?: number;
	disabled?: boolean;
	formatValue?: (value: number) => string;
	className?: string;
}
