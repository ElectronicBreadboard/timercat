import { cn, GripIcon } from '@repo/ui';
import React from 'react';

export const DragWidgetHandle: React.FC<TDragWidgetHandleProps> = (props) => {
	const { className } = props;

	return (
		<div
			data-drag-region
			className={cn(
				'bg-base-100/90 flex cursor-grab items-center justify-center opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing active:opacity-100',
				className
			)}
		>
			<GripIcon className="text-base-500/60 group-hover:text-base-600 active:text-base-600 size-3 transition-colors" />
		</div>
	);
};

export interface TDragWidgetHandleProps {
	className?: string;
}
