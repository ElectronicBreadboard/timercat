import { cva, type VariantProps } from 'class-variance-authority';
import React from 'react';
import { ChevronRightIcon } from '@/components';
import { cn } from '@/lib';

const settingItemVariants = cva('flex w-full items-center justify-between px-4 py-3 text-left', {
	variants: {
		variant: {
			static: '',
			button: [
				'transition-colors duration-100 hover:bg-base-100',
				'outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset'
			],
			link: [
				'transition-colors duration-100 hover:bg-base-100',
				'outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset'
			]
		}
	},
	defaultVariants: {
		variant: 'static'
	}
});

export const SettingItem: React.FC<TSettingItemProps> = (props) => {
	const { label, description, variant = 'static', onClick, children, className } = props;
	const isInteractive = variant === 'button' || variant === 'link';

	const content = (
		<>
			<div className="flex-1 pr-4">
				<span className="text-base-900 text-sm font-medium">{label}</span>
				{description != null && <p className="text-base-500 text-xs">{description}</p>}
			</div>
			<div className="flex shrink-0 items-center gap-2">
				{children}
				{variant === 'link' && <ChevronRightIcon className="text-base-400 size-4" />}
			</div>
		</>
	);

	if (isInteractive) {
		return (
			<button
				type="button"
				onClick={onClick}
				className={cn(settingItemVariants({ variant }), className)}
			>
				{content}
			</button>
		);
	}

	return <div className={cn(settingItemVariants({ variant }), className)}>{content}</div>;
};

export interface TSettingItemProps extends VariantProps<typeof settingItemVariants> {
	label: string;
	description?: string;
	onClick?: () => void;
	children?: React.ReactNode;
	className?: string;
}
