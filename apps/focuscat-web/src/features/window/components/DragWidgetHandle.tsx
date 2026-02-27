import { cn, GripIcon } from '@repo/ui';
import React from 'react';

export const DragWidgetHandle: React.FC<TDragWidgetHandleProps> = (props) => {
	const { className } = props;

	const handlePointerDown = React.useCallback((e: React.PointerEvent) => {
		if (e.button !== 0) {
			return;
		}
		document.body.style.cursor = 'grabbing';
		const clear = () => {
			document.body.style.cursor = '';
			document.removeEventListener('pointerup', clear);
			document.removeEventListener('pointercancel', clear);
		};
		document.addEventListener('pointerup', clear);
		document.addEventListener('pointercancel', clear);
	}, []);

	return (
		<div
			data-drag-region
			className={cn(
				'bg-base-100/90 flex cursor-grab items-center justify-center opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing active:opacity-100',
				className
			)}
			onPointerDown={handlePointerDown}
		>
			<GripIcon className="text-base-500/60 group-hover:text-base-600 active:text-base-600 size-3 transition-colors" />
		</div>
	);
};

export interface TDragWidgetHandleProps {
	className?: string;
}
