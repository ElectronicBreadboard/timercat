import { Button as BaseButton } from '@base-ui/react/button';
import { cva, type VariantProps } from 'class-variance-authority';
import React from 'react';
import { cn } from '@/lib';

const iconButtonVariants = cva(
	[
		'inline-flex items-center justify-center rounded-md select-none',
		'outline-none focus-visible:ring-2 focus-visible:ring-primary',
		'disabled:opacity-50 disabled:cursor-not-allowed',
		'transition-colors duration-100'
	],
	{
		variants: {
			variant: {
				default: [
					'bg-base-100 text-base-600',
					'hover:bg-base-200 hover:text-base-900',
					'active:bg-base-300'
				],
				ghost: ['text-base-400', 'hover:text-base-600 hover:bg-base-100', 'active:bg-base-200'],
				bare: ['text-base-400', 'hover:text-base-600', 'active:text-base-900'],
				primary: ['bg-primary text-primary-content', 'hover:brightness-110', 'active:brightness-90']
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
	extends React.ComponentProps<typeof BaseButton>, VariantProps<typeof iconButtonVariants> {}
