import React from 'react';
import { useAppInfo, usePlatform } from '@/hooks';
import { cn } from '@/lib';
import { Badge } from '../display';

export const WindowHeader: React.FC<TWindowHeaderProps> = (props) => {
	const { title, children, className, showBadge = true } = props;
	const platform = usePlatform();
	const appInfo = useAppInfo();

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
			{showBadge &&
				(appInfo.stage === 'dev' ? (
					<Badge variant="warning" className="ml-2">
						DEV
					</Badge>
				) : (
					appInfo.version.startsWith('v0.') && (
						<Badge
							className={cn(
								'ml-2',
								appInfo.distribution === 'appStore'
									? 'bg-blue-400/10 text-blue-400'
									: 'bg-purple-400/10 text-purple-400'
							)}
						>
							BETA
						</Badge>
					)
				))}
			<div data-tauri-drag-region className="flex-1" />
			{children != null && <div className="flex items-center gap-1 pr-1">{children}</div>}
		</header>
	);
};

export interface TWindowHeaderProps {
	title?: string;
	children?: React.ReactNode;
	className?: string;
	showBadge?: boolean;
}
