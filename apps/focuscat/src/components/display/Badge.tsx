import { cva, type VariantProps } from 'class-variance-authority';
import React from 'react';
import { cn } from '@/lib';

const badgeVariants = cva(
	['inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium'],
	{
		variants: {
			variant: {
				success: 'bg-green-50 text-green-600',
				warning: 'bg-amber-50 text-amber-600',
				error: 'bg-red-50 text-red-600',
				neutral: 'bg-gray-100 text-gray-600'
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
	extends React.HTMLAttributes<HTMLSpanElement>,
		VariantProps<typeof badgeVariants> {}
