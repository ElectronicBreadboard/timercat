import { Badge, cn } from '@repo/ui';
import React from 'react';

/**
 * Web equivalent of the desktop's WindowHeader.
 *
 * Uses pl-[70px] to leave space for the DraggableWindow traffic lights overlay
 * (matching macOS pl-[70px] convention). Mark draggable areas with data-drag-region
 * so DraggableWindow's pointer handler picks them up.
 *
 * When used standalone (e.g. landing page preview), pass showTrafficLights to render
 * decorative circles instead of the DraggableWindow overlay.
 */
export const WindowHeader: React.FC<TWindowHeaderProps> = (props) => {
	const { badge, title, showTrafficLights = false, children, className } = props;

	return (
		<header
			data-drag-region
			className={cn(
				'border-base-200 bg-base-50 flex h-8 shrink-0 items-center border-b select-none',
				showTrafficLights ? 'pl-3' : 'pl-[70px]',
				className
			)}
		>
			{/* Decorative traffic lights — only when no DraggableWindow overlay (e.g. landing page) */}
			{showTrafficLights && (
				<div className="mr-2 flex items-center gap-1.5">
					<div className="size-2.5 rounded-full bg-[#FF5F57]" />
					<div className="size-2.5 rounded-full bg-[#FFBD2E]" />
					<div className="size-2.5 rounded-full bg-[#28C840]" />
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
	/** Show decorative traffic light circles. Use when WindowHeader is rendered without a DraggableWindow (e.g. landing page preview). */
	showTrafficLights?: boolean;
	children?: React.ReactNode;
	className?: string;
}
