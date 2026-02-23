import { Badge, cn } from '@repo/ui';
import React from 'react';

export const WindowHeader: React.FC<TWindowHeaderProps> = (props) => {
	const { title, showBadge = true, decorative = false, children, className } = props;

	return (
		<header
			data-drag-region
			className={cn(
				'border-base-200 bg-base-50 flex shrink-0 items-center border-b select-none',
				decorative ? 'h-8 pl-2' : 'h-11 pl-[100px] sm:h-8 sm:pl-[70px]',
				className
			)}
		>
			{decorative && (
				<div className="flex items-center gap-[10px]">
					<div className="size-[14px] rounded-full bg-[#FF5F57] ring-1 ring-black/20" />
					<div className="size-[14px] rounded-full bg-[#FFBD2E] ring-1 ring-black/20" />
					<div className="size-[14px] rounded-full bg-[#28C840] ring-1 ring-black/20" />
				</div>
			)}
			{title != null && <span className="text-base-600 ml-2 text-sm font-semibold">{title}</span>}
			{showBadge && <Badge className="ml-2 bg-purple-400/10 text-purple-400">WEB</Badge>}
			<div data-drag-region className="flex-1" />
			{children != null && (
				<div
					className={cn(
						'flex items-center',
						decorative ? 'gap-1 pr-1' : 'gap-2 pr-2 sm:gap-1 sm:pr-1'
					)}
				>
					{children}
				</div>
			)}
		</header>
	);
};

export interface TWindowHeaderProps {
	title?: string;
	showBadge?: boolean;
	decorative?: boolean;
	children?: React.ReactNode;
	className?: string;
}
