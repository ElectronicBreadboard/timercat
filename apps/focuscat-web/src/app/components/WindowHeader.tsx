import { Badge, cn } from '@repo/ui';
import React from 'react';

export const WindowHeader: React.FC<TWindowHeaderProps> = (props) => {
	const { badge, title, decorativeTrafficLights = false, children, className } = props;

	return (
		<header
			data-drag-region
			className={cn(
				'border-base-200 bg-base-50 flex h-8 shrink-0 items-center border-b select-none',
				decorativeTrafficLights ? 'pl-2' : 'pl-[70px]',
				className
			)}
		>
			{decorativeTrafficLights && (
				<div className="mr-2 flex items-center gap-[6px]">
					<div className="size-[12px] rounded-full bg-[#FF5F57] ring-1 ring-black/20" />
					<div className="size-[12px] rounded-full bg-[#FFBD2E] ring-1 ring-black/20" />
					<div className="size-[12px] rounded-full bg-[#28C840] ring-1 ring-black/20" />
				</div>
			)}

			{badge != null && <Badge className="bg-purple-400/10 text-purple-400">{badge}</Badge>}

			{title != null && <span className="text-base-400 text-xs font-medium">{title}</span>}

			<div data-drag-region className="flex-1" />

			{children != null && <div className="flex items-center gap-1 pr-1">{children}</div>}
		</header>
	);
};

export interface TWindowHeaderProps {
	badge?: string;
	title?: string;
	/** Show non-interactive traffic lights (e.g. on landing page when not using DraggableWindow). */
	decorativeTrafficLights?: boolean;
	children?: React.ReactNode;
	className?: string;
}
