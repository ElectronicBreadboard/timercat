import { Dialog as BaseDialog } from '@base-ui/react/dialog';
import React from 'react';
import { cn } from '@/lib';

const Content: React.FC<TContentProps> = (props) => {
	const { className, children } = props;

	return (
		<BaseDialog.Portal>
			<BaseDialog.Backdrop className="fixed inset-0 min-h-dvh bg-black/20 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-[-webkit-touch-callout:none]:absolute" />
			<BaseDialog.Popup
				className={cn(
					'bg-base-50 outline-base-200 text-base-900',
					'fixed top-1/2 left-1/2 -mt-8 w-96 max-w-[calc(100vw-3rem)] -translate-x-1/2 -translate-y-1/2 rounded-lg p-6 outline-1',
					'transition-all duration-150',
					'data-starting-style:scale-90 data-starting-style:opacity-0',
					'data-ending-style:scale-90 data-ending-style:opacity-0',
					className
				)}
			>
				{children}
			</BaseDialog.Popup>
		</BaseDialog.Portal>
	);
};

interface TContentProps {
	className?: string;
	children: React.ReactNode;
}

export const Dialog = {
	Root: BaseDialog.Root,
	Trigger: BaseDialog.Trigger,
	Close: BaseDialog.Close,
	Title: BaseDialog.Title,
	Description: BaseDialog.Description,
	Content
};
