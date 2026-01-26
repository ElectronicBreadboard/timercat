import { Popover } from '@base-ui/react/popover';
import React from 'react';
import { cn } from '@/lib';

export const MultiSelectRoot: React.FC<TMultiSelectRootProps> = (props) => {
	const { open, children } = props;
	return <Popover.Root open={open}>{children}</Popover.Root>;
};

export const MultiSelectContainer: React.FC<TMultiSelectContainerProps> = (props) => {
	const { open, className, children, onClick, side } = props;

	return (
		<Popover.Trigger
			className={cn(open ? containerOpen : containerClosed, className)}
			render={<div />}
			onClick={onClick}
			data-side={side}
		>
			{children}
		</Popover.Trigger>
	);
};

export const MultiSelectInput = React.forwardRef<HTMLInputElement, TMultiSelectInputProps>(
	(props, ref) => {
		const { className, ...rest } = props;
		return <input ref={ref} type="text" className={cn(inputStyles, className)} {...rest} />;
	}
);
MultiSelectInput.displayName = 'MultiSelectInput';

export const MultiSelectPortal = Popover.Portal;

export const MultiSelectPositioner: React.FC<TMultiSelectPositionerProps> = (props) => {
	const { children, sideOffset = 0, collisionPadding = 8 } = props;

	return (
		<Popover.Positioner side="bottom" sideOffset={sideOffset} collisionPadding={collisionPadding}>
			{children}
		</Popover.Positioner>
	);
};

export const MultiSelectPopup = React.forwardRef<HTMLDivElement, TMultiSelectPopupProps>(
	(props, ref) => {
		const { className, children } = props;

		return (
			<Popover.Popup
				ref={ref}
				className={cn(popupStyles, className)}
				data-popup
				initialFocus={false}
			>
				{children}
			</Popover.Popup>
		);
	}
);
MultiSelectPopup.displayName = 'MultiSelectPopup';

export const MultiSelectHelperText: React.FC<TMultiSelectHelperTextProps> = (props) => {
	const { children, className } = props;

	return (
		<div
			className={cn(
				'border-base-100 text-base-500 border-b px-3 py-2 text-xs',
				'group-data-[side=top]:border-t group-data-[side=top]:border-b-0',
				className
			)}
		>
			{children}
		</div>
	);
};

export const MultiSelectEmpty: React.FC<TMultiSelectEmptyProps> = (props) => {
	const { children, className } = props;
	return <div className={cn('text-base-500 px-3 py-3 text-sm', className)}>{children}</div>;
};

export const MultiSelect = {
	Root: MultiSelectRoot,
	Container: MultiSelectContainer,
	Input: MultiSelectInput,
	Portal: MultiSelectPortal,
	Positioner: MultiSelectPositioner,
	Popup: MultiSelectPopup,
	HelperText: MultiSelectHelperText,
	Empty: MultiSelectEmpty
};

// MARK: - Styles

const baseContainer = cn(
	'flex flex-wrap content-start items-center gap-1.5 min-h-10 px-2.5 py-1.5',
	'bg-base-50 cursor-text overflow-hidden outline-none',
	'border-y border-transparent' // Consistent height across states
);

const containerClosed = cn(
	baseContainer,
	'rounded-md ring-1 ring-base-200 focus-within:ring-2 focus-within:ring-primary'
);

// Note: clip-path clips ring on connecting edge for seamless appearance
const containerOpen = cn(
	baseContainer,
	'ring-2 ring-primary',
	// Bottom (default)
	'rounded-t-md border-b-base-200 [clip-path:inset(-2px_-2px_0_-2px)]',
	// Top
	'data-[side=top]:rounded-t-none data-[side=top]:rounded-b-md',
	'data-[side=top]:border-t-base-200 data-[side=top]:border-b-transparent',
	'data-[side=top]:[clip-path:inset(0_-2px_-2px_-2px)]'
);

const popupStyles = cn(
	'w-[var(--anchor-width)] max-h-64 overflow-y-auto bg-white ring-2 ring-primary outline-none',
	'group flex flex-col rounded-b-md [clip-path:inset(0_-2px_-2px_-2px)]',
	// Top
	'data-[side=top]:flex-col-reverse data-[side=top]:rounded-t-md data-[side=top]:rounded-b-none',
	'data-[side=top]:[clip-path:inset(-2px_-2px_0_-2px)]'
);

const inputStyles = cn(
	'min-w-20 flex-1 border-none bg-transparent py-0.5 text-sm',
	'shadow-none ring-0 outline-none placeholder:text-base-400',
	// Collapse when not focused and has items
	'data-[collapsed]:min-w-0 data-[collapsed]:w-0 data-[collapsed]:p-0'
);

// MARK: - Types

export interface TMultiSelectRootProps {
	open: boolean;
	children: React.ReactNode;
}

export interface TMultiSelectContainerProps {
	open: boolean;
	className?: string;
	children: React.ReactNode;
	onClick?: () => void;
	side?: 'top' | 'bottom';
}

export interface TMultiSelectInputProps extends Omit<
	React.InputHTMLAttributes<HTMLInputElement>,
	'type'
> {}

export interface TMultiSelectPositionerProps {
	children: React.ReactNode;
	sideOffset?: number;
	collisionPadding?: number;
}

export interface TMultiSelectPopupProps {
	className?: string;
	children: React.ReactNode;
}

export interface TMultiSelectHelperTextProps {
	children: React.ReactNode;
	className?: string;
}

export interface TMultiSelectEmptyProps {
	children: React.ReactNode;
	className?: string;
}
