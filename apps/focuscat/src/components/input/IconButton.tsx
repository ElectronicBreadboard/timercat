import { Button as BaseButton } from '@base-ui/react/button';
import { cva, type VariantProps } from 'class-variance-authority';
import React from 'react';
import { cn } from '@/lib';

const iconButtonVariants = cva(
	[
		'inline-flex items-center justify-center rounded-md select-none',
		'outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
		'disabled:opacity-50 disabled:cursor-not-allowed',
		'transition-colors duration-100'
	],
	{
		variants: {
			variant: {
				default: ['bg-gray-100 text-gray-600', 'hover:bg-gray-200 hover:text-gray-900', 'active:bg-gray-300'],
				ghost: ['text-gray-400', 'hover:text-gray-600 hover:bg-gray-100', 'active:bg-gray-200'],
				bare: ['text-gray-400', 'hover:text-gray-600', 'active:text-gray-900'],
				primary: ['bg-blue-500 text-white', 'hover:bg-blue-600', 'active:bg-blue-700']
			},
			size: {
				sm: 'size-8',
				md: 'size-10',
				lg: 'size-11'
			}
		},
		defaultVariants: {
			variant: 'default',
			size: 'md'
		}
	}
);

export const IconButton: React.FC<TIconButtonProps> = (props) => {
	const { variant, size, className, children, ...rest } = props;

	return (
		<BaseButton className={cn(iconButtonVariants({ variant, size }), className)} {...rest}>
			{children}
		</BaseButton>
	);
};

export interface TIconButtonProps
	extends React.ComponentProps<typeof BaseButton>,
		VariantProps<typeof iconButtonVariants> {}
