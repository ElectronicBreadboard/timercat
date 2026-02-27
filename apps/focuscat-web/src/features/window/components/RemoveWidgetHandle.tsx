import { cn, XIcon } from '@repo/ui';
import React from 'react';

export const RemoveWidgetHandle: React.FC<TRemoveWidgetHandleProps> = (props) => {
	const { className, onRemove } = props;

	const handleClick = React.useCallback(
		(e: React.MouseEvent) => {
			e.preventDefault();
			e.stopPropagation();
			onRemove?.();
		},
		[onRemove]
	);

	return (
		<button
			type="button"
			aria-label="Remove"
			className={cn(
				'bg-base-100/90 flex cursor-pointer items-center justify-center opacity-0 transition-opacity group-hover:opacity-100',
				className
			)}
			onClick={handleClick}
		>
			<XIcon className="size-3 text-red-400 transition-colors hover:text-red-500 dark:text-red-500/80 dark:hover:text-red-400/90" />
		</button>
	);
};

export interface TRemoveWidgetHandleProps {
	className?: string;
	onRemove?: () => void;
}
