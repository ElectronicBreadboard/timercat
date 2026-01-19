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
				'border-base-200 bg-base-50 flex h-8 shrink-0 items-center border-b select-none',
				platform === 'macos' ? 'pl-[70px]' : 'pl-2',
				className
			)}
		>
			{title != null && (
				<span data-tauri-drag-region className="text-base-600 ml-2 text-sm font-semibold">
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
