import React from 'react';
import { ChevronRightIcon } from '@/components';
import { cn } from '@/lib';

export const SettingItem: React.FC<TSettingItemProps> = (props) => {
	const { label, description, onClick, children, className } = props;

	const content = (
		<>
			<div className="flex-1 pr-4">
				<span className="text-sm font-medium text-gray-900">{label}</span>
				{description != null && <p className="text-xs text-gray-500">{description}</p>}
			</div>
			<div className="flex shrink-0 items-center gap-2">
				{children}
				{onClick != null && <ChevronRightIcon className="size-4 text-gray-400" />}
			</div>
		</>
	);

	if (onClick != null) {
		return (
			<button
				type="button"
				onClick={onClick}
				className={cn(
					'flex w-full items-center justify-between px-4 py-3 text-left',
					'transition-colors duration-100 hover:bg-gray-100',
					'outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset',
					className
				)}
			>
				{content}
			</button>
		);
	}

	return (
		<div className={cn('flex items-center justify-between px-4 py-3', className)}>{content}</div>
	);
};

export interface TSettingItemProps {
	label: string;
	description?: string;
	onClick?: () => void;
	children?: React.ReactNode;
	className?: string;
}
