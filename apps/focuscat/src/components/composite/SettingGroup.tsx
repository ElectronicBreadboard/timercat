import React from 'react';
import { cn } from '@/lib';

export const SettingGroup: React.FC<TSettingGroupProps> = (props) => {
	const { title, children, className } = props;

	return (
		<div className={cn('space-y-2', className)}>
			{title != null && (
				<h2 className="text-xs font-medium tracking-wider text-gray-500 uppercase">{title}</h2>
			)}
			<div className="divide-y divide-gray-200 rounded-md border border-gray-200 bg-gray-50">
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
