import React from 'react';
import { cn } from '@/lib';

export const SegmentedControl = <T extends string>(
	props: TSegmentedControlProps<T>
): React.ReactNode => {
	const { value, onChange, options, className } = props;

	return (
		<div className={cn('bg-base-100 flex rounded-md p-0.5', className)}>
			{options.map((option) => (
				<button
					key={option.value}
					type="button"
					onClick={() => onChange(option.value)}
					aria-label={option.ariaLabel}
					className={cn(
						'rounded px-3 py-1 text-sm font-medium transition-colors',
						value === option.value
							? 'bg-base-0 text-base-900 shadow-sm'
							: 'text-base-500 hover:text-base-700'
					)}
				>
					{option.label}
				</button>
			))}
		</div>
	);
};

export interface TSegmentedControlProps<T extends string> {
	value: T;
	onChange: (value: T) => void;
	options: TSegmentedControlOption<T>[];
	className?: string;
}

export interface TSegmentedControlOption<T extends string> {
	value: T;
	label: React.ReactNode;
	ariaLabel?: string;
}
