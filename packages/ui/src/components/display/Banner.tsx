import { cva, type VariantProps } from 'class-variance-authority';
import React from 'react';
import { cn } from '@/lib';
import { AlertIcon } from './icons';

const bannerVariants = cva('flex w-full items-start gap-3 rounded-lg border p-3 text-left', {
	variants: {
		variant: {
			warning: 'border-warning/30 bg-warning/10 text-warning',
			error: 'border-error/30 bg-error/10 text-error',
			info: 'border-primary/30 bg-primary/10 text-primary'
		}
	},
	defaultVariants: {
		variant: 'warning'
	}
});

export const Banner: React.FC<TBannerProps> = (props) => {
	const { variant, children, className } = props;

	return (
		<div className={cn(bannerVariants({ variant }), className)}>
			<AlertIcon size={16} className="mt-0.5 shrink-0" />
			<div className="flex-1">{children}</div>
		</div>
	);
};

export interface TBannerProps extends VariantProps<typeof bannerVariants> {
	children: React.ReactNode;
	className?: string;
}
