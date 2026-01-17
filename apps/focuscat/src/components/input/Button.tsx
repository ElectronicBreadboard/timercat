import { Button as BaseButton } from '@base-ui/react/button';
import { cva, type VariantProps } from 'class-variance-authority';
import React from 'react';
import { cn } from '@/lib';

const buttonVariants = cva(
	[
		'inline-flex items-center justify-center rounded-md font-medium select-none',
		'outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
		'disabled:cursor-not-allowed disabled:opacity-50',
		'transition-colors duration-100'
	],
	{
		variants: {
			variant: {
				default: [
					'border border-gray-200 bg-gray-50 text-gray-900',
					'hover:bg-gray-100',
					'active:bg-gray-200'
				],
				primary: [
					'border border-blue-600 bg-blue-500 text-white',
					'hover:bg-blue-600',
					'active:bg-blue-700'
				],
				danger: [
					'border border-red-200 bg-red-50 text-red-600',
					'hover:bg-red-100',
					'active:bg-red-200'
				],
				ghost: [
					'text-gray-600',
					'hover:bg-gray-100 hover:text-gray-900',
					'active:bg-gray-200'
				]
			},
			size: {
				sm: 'h-8 px-2.5 text-sm',
				md: 'h-10 px-3.5 text-base',
				lg: 'h-12 px-5 text-lg'
			}
		},
		defaultVariants: {
			variant: 'default',
			size: 'md'
		}
	}
);

export const Button: React.FC<TButtonProps> = (props) => {
	const { variant, size, className, children, ...rest } = props;

	return (
		<BaseButton className={cn(buttonVariants({ variant, size }), className)} {...rest}>
			{children}
		</BaseButton>
	);
};

export interface TButtonProps
	extends React.ComponentProps<typeof BaseButton>,
		VariantProps<typeof buttonVariants> {}
