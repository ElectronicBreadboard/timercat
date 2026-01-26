import { Input as BaseInput } from '@base-ui/react/input';
import { cva, type VariantProps } from 'class-variance-authority';
import React from 'react';
import { cn } from '@/lib';

const inputVariants = cva(
	[
		'w-full rounded-md border bg-base-50 text-base-900',
		'placeholder:text-base-400',
		'outline-none focus:ring-2 focus:ring-primary focus:-ring-offset-1',
		'disabled:cursor-not-allowed disabled:opacity-50',
		'transition-colors duration-100'
	],
	{
		variants: {
			variant: {
				default: 'border-base-200',
				error: 'border-error'
			},
			size: {
				sm: 'h-8 px-2.5 text-sm',
				md: 'h-10 px-3.5 text-base',
				lg: 'h-12 px-4 text-lg'
			}
		},
		defaultVariants: {
			variant: 'default',
			size: 'md'
		}
	}
);

export const Input = React.forwardRef<HTMLInputElement, TInputProps>((props, ref) => {
	const { variant, inputSize, className, ...rest } = props;

	return (
		<BaseInput ref={ref} className={cn(inputVariants({ variant, size: inputSize }), className)} {...rest} />
	);
});

Input.displayName = 'Input';

type TInputVariants = VariantProps<typeof inputVariants>;

export interface TInputProps extends React.ComponentProps<typeof BaseInput> {
	variant?: TInputVariants['variant'];
	/** Size variant (renamed to avoid conflict with HTML size attribute) */
	inputSize?: TInputVariants['size'];
}
