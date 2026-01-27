import { Popover } from '@base-ui/react/popover';
import React from 'react';
import { cn } from '@/lib';

/** Root wrapper that manages popup open state via base-ui Popover */
const Root: React.FC<TMultiSelectRootProps> = (props) => {
	const { open, onOpenChange, children } = props;
	return (
		<Popover.Root open={open} onOpenChange={onOpenChange}>
			{children}
		</Popover.Root>
	);
};

export interface TMultiSelectRootProps {
	/** Whether the popup is open */
	open: boolean;
	/** Called when popup open state changes */
	onOpenChange?: (open: boolean) => void;
	children: React.ReactNode;
}

/**
 * Container that holds chips and input.
 * Renders as a div but acts as the Popover trigger.
 */
const Container = React.forwardRef<HTMLDivElement, TMultiSelectContainerProps>((props, ref) => {
	const { open, side, className, children, onClick } = props;

	return (
		<Popover.Trigger
			// Cast needed: Popover.Trigger types expect HTMLButtonElement, but we render div
			ref={ref as unknown as React.RefObject<HTMLButtonElement>}
			className={cn(open ? containerOpen : containerClosed, className)}
			render={<div />}
			onClick={onClick}
			data-side={side}
		>
			{children}
		</Popover.Trigger>
	);
});
Container.displayName = 'MultiSelect.Container';

export interface TMultiSelectContainerProps {
	/** Whether the popup is open (affects styling) */
	open?: boolean;
	/** Popup position relative to container (affects connected visual) */
	side?: 'top' | 'bottom';
	className?: string;
	children: React.ReactNode;
	onClick?: () => void;
}

/** Search input for filtering results */
const Input = React.forwardRef<HTMLInputElement, TMultiSelectInputProps>((props, ref) => {
	const { className, ...rest } = props;
	return (
		<input
			ref={ref}
			type="text"
			spellCheck={false}
			autoComplete="off"
			autoCorrect="off"
			autoCapitalize="off"
			className={cn(inputStyles, className)}
			{...rest}
		/>
	);
});
Input.displayName = 'MultiSelect.Input';

export type TMultiSelectInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>;

/** Positions the popup relative to the container */
const Positioner: React.FC<TMultiSelectPositionerProps> = (props) => {
	const { children, sideOffset = 0, collisionPadding = 8 } = props;

	return (
		<Popover.Positioner side="bottom" sideOffset={sideOffset} collisionPadding={collisionPadding}>
			{children}
		</Popover.Positioner>
	);
};

export interface TMultiSelectPositionerProps {
	children: React.ReactNode;
	/** Gap between container and popup (default: 0 for connected visual) */
	sideOffset?: number;
	/** Padding from viewport edges (default: 8) */
	collisionPadding?: number;
}

/** Popup container for search results */
const Popup = React.forwardRef<HTMLDivElement, TMultiSelectPopupProps>((props, ref) => {
	const { className, children } = props;

	return (
		<Popover.Popup
			ref={ref}
			className={cn(popupStyles, className)}
			// data-popup: marker for blur handling (check if focus moved to popup)
			data-popup
			// initialFocus={false}: keep focus on input for continuous typing
			initialFocus={false}
		>
			{children}
		</Popover.Popup>
	);
});
Popup.displayName = 'MultiSelect.Popup';

export interface TMultiSelectPopupProps {
	className?: string;
	children: React.ReactNode;
}

/** Helper text shown at top/bottom of popup (e.g., "Searching..." or instructions) */
const HelperText: React.FC<TMultiSelectHelperTextProps> = (props) => {
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

export interface TMultiSelectHelperTextProps {
	children: React.ReactNode;
	className?: string;
}

/** Empty state shown when search returns no results */
const Empty: React.FC<TMultiSelectEmptyProps> = (props) => {
	const { children, className } = props;
	return <div className={cn('text-base-500 px-3 py-3 text-sm', className)}>{children}</div>;
};

export interface TMultiSelectEmptyProps {
	children: React.ReactNode;
	className?: string;
}

/**
 * Compound component for multi-select with async search.
 * Use with `useMultiSelect` hook for state management.
 *
 * @example
 * ```tsx
 * <MultiSelect.Root {...multiSelect.getRootProps()}>
 *   <MultiSelect.Container {...multiSelect.getContainerProps()}>
 *     <MultiSelect.Input {...multiSelect.getInputProps()} />
 *   </MultiSelect.Container>
 *   <MultiSelect.Portal>
 *     <MultiSelect.Positioner>
 *       <MultiSelect.Popup {...multiSelect.getPopupProps()}>
 *         <MultiSelect.HelperText>Select an item</MultiSelect.HelperText>
 *         {results.map(item => <ResultItem />)}
 *       </MultiSelect.Popup>
 *     </MultiSelect.Positioner>
 *   </MultiSelect.Portal>
 * </MultiSelect.Root>
 * ```
 */
export const MultiSelect = {
	Root,
	Container,
	Input,
	Portal: Popover.Portal,
	Positioner,
	Popup,
	HelperText,
	Empty
};

// MARK: - Styles
//
// Connected Visual: Container and popup share a continuous ring border, appearing as
// one unified element. This requires:
// 1. clip-path to hide the ring on the connecting edge
// 2. data-side to style container based on popup position (top vs bottom)
// 3. Matching border-radius on connecting edges

const baseContainer = cn(
	'flex flex-wrap content-start items-center gap-1.5 min-h-10 px-2.5 py-1.5',
	'bg-base-50 cursor-text overflow-hidden outline-none',
	'border-y border-transparent' // Placeholder border for consistent height
);

const containerClosed = cn(
	baseContainer,
	'rounded-md ring-1 ring-base-200 focus-within:ring-2 focus-within:ring-primary'
);

const containerOpen = cn(
	baseContainer,
	'ring-2 ring-primary',
	// Popup below: round top, clip bottom ring, show bottom border
	'rounded-t-md border-b-base-200 [clip-path:inset(-2px_-2px_0_-2px)]',
	// Popup above: round bottom, clip top ring, show top border
	'data-[side=top]:rounded-t-none data-[side=top]:rounded-b-md',
	'data-[side=top]:border-t-base-200 data-[side=top]:border-b-transparent',
	'data-[side=top]:[clip-path:inset(0_-2px_-2px_-2px)]'
);

const popupStyles = cn(
	// --anchor-width and --available-height are CSS vars set by base-ui
	'w-[var(--anchor-width)] max-h-[min(300px,var(--available-height,300px))]',
	'overflow-y-auto bg-base-50 ring-2 ring-primary outline-none',
	// group: enables group-data-[side=top] selectors for children (e.g., HelperText)
	'group flex flex-col rounded-b-md [clip-path:inset(0_-2px_-2px_-2px)]',
	// Popup above: reverse flex order so first item is visually at bottom (near input)
	'data-[side=top]:flex-col-reverse data-[side=top]:rounded-t-md data-[side=top]:rounded-b-none',
	'data-[side=top]:[clip-path:inset(-2px_-2px_0_-2px)]'
);

const inputStyles = cn(
	'min-w-20 flex-1 border-none bg-transparent py-0.5 text-sm text-base-900',
	'shadow-none ring-0 outline-none placeholder:text-base-400',
	// Collapse to zero width when unfocused with selections (shows only chips)
	'data-[collapsed]:min-w-0 data-[collapsed]:w-0 data-[collapsed]:p-0'
);
