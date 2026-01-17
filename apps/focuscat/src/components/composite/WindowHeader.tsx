import React from 'react';
import { usePlatform } from '@/hooks';
import { cn } from '@/lib';

export const WindowHeader: React.FC<TWindowHeaderProps> = (props) => {
	const { title, children, className } = props;
	const platform = usePlatform();

	return (
		<header
			data-tauri-drag-region
			className={cn(
				'flex h-8 shrink-0 select-none items-center border-b border-gray-200 bg-gray-50',
				platform === 'macos' ? 'pl-[70px]' : 'pl-2',
				className
			)}
		>
			{title != null && (
				<span data-tauri-drag-region className="ml-2 text-sm font-semibold text-gray-600">
					{title}
				</span>
			)}
			<div data-tauri-drag-region className="flex-1" />
			{children != null && <div className="flex items-center gap-1 pr-1">{children}</div>}
		</header>
	);
};

export interface TWindowHeaderProps {
	title?: string;
	children?: React.ReactNode;
	className?: string;
}
