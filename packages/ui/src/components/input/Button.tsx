import {
	Button as BaseButton,
	type ButtonProps as BaseButtonProps
} from '@base-ui-components/react/button';
import { cva, type VariantProps } from 'class-variance-authority';
import React from 'react';
import { cn } from '@/lib';

export const buttonVariants = cva(
	'cursor-pointer inline-flex items-center justify-center m-0 outline-0 border font-inherit font-normal leading-none select-none focus-visible:outline focus-visible:outline-offset-[0.3ch]',
	{
		variants: {
			variant: {
				primary:
					'border-primary bg-primary text-primary-content rounded-full hover:data-disabled:bg-primary hover:bg-primary/90 active:data-disabled:bg-primary active:bg-primary/90 focus-visible:outline-primary data-disabled:text-primary-content/50 active:scale-97 active:data-disabled:scale-100',
				neutral:
					'border-base-200 bg-base-50 text-base-content rounded-full hover:data-disabled:bg-base-50 hover:bg-base-100 active:data-disabled:bg-base-50 active:bg-base-100 active:shadow-[inset_0_1px_3px_rgba(0,0,0,0.1)] active:data-disabled:shadow-none focus-visible:outline-primary data-disabled:text-base-500 active:scale-97 active:data-disabled:scale-100',
				secondary:
					'border-transparent bg-transparent text-secondary hover:underline hover:decoration-secondary active:scale-95 focus-visible:outline-secondary data-disabled:text-secondary/50',
				accent:
					'border-transparent bg-transparent text-accent hover:underline hover:decoration-accent active:scale-95 focus-visible:outline-accent data-disabled:text-accent/50'
			},
			size: {
				lg: 'py-3 px-6 text-base',
				md: 'py-3 px-5 text-base',
				sm: 'py-2 px-4 text-sm'
			}
		},
		defaultVariants: {
			variant: 'neutral',
			size: 'md'
		}
	}
);

export const Button: React.FC<TButtonProps> = (props) => {
	const { variant, size, className, ...buttonProps } = props;
	return (
		<BaseButton className={cn(buttonVariants({ variant, size }), className)} {...buttonProps} />
	);
};

export type TButtonProps = BaseButtonProps & VariantProps<typeof buttonVariants>;

export const ButtonLink: React.FC<TButtonLinkProps> = (props) => {
	const { variant, size, className, href, ...anchorProps } = props;
	return (
		<BaseButton
			render={React.createElement('a', { href, ...anchorProps })}
			nativeButton={false}
			className={cn(buttonVariants({ variant, size }), className)}
		/>
	);
};

export interface TButtonLinkProps
	extends VariantProps<typeof buttonVariants>,
		Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'className'> {
	href: string;
	className?: string;
}
