import React from 'react';
import { cn } from '@/lib';

export const SettingGroup: React.FC<TSettingGroupProps> = (props) => {
	const { title, children, className } = props;

	return (
		<div className={cn('space-y-2', className)}>
			{title != null && (
				<h2 className="text-base-500 text-xs font-medium tracking-wider uppercase">{title}</h2>
			)}
			<div className="divide-base-200 border-base-200 bg-base-50 divide-y rounded-md border">
				{children}
			</div>
		</div>
	);
};

export interface TSettingGroupProps {
	title?: string;
	children: React.ReactNode;
	className?: string;
}
