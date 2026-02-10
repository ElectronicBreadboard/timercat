import { cva, type VariantProps } from 'class-variance-authority';
import React from 'react';
import { cn } from '@/lib';

const badgeVariants = cva(
	['inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium'],
	{
		variants: {
			variant: {
				success: 'bg-success/10 text-success',
				warning: 'bg-warning/10 text-warning',
				error: 'bg-error/10 text-error',
				neutral: 'bg-base-100 text-base-600'
			}
		},
		defaultVariants: {
			variant: 'neutral'
		}
	}
);

export const Badge: React.FC<TBadgeProps> = (props) => {
	const { variant, className, children, ...rest } = props;

	return (
		<span className={cn(badgeVariants({ variant }), className)} {...rest}>
			{children}
		</span>
	);
};

export interface TBadgeProps
	extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}
