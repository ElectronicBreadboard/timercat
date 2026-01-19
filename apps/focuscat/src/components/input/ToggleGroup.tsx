import { Toggle } from '@base-ui/react/toggle';
import { ToggleGroup as BaseToggleGroup } from '@base-ui/react/toggle-group';
import React from 'react';
import { cn } from '@/lib';

const ToggleGroupRoot: React.FC<TToggleGroupProps> = (props) => {
	const { value, onValueChange, className, children } = props;

	return (
		<BaseToggleGroup
			value={value != null ? [value] : []}
			onValueChange={(newValue) => {
				const selected = newValue[newValue.length - 1];
				if (selected != null) {
					onValueChange(selected);
				}
			}}
			className={cn('bg-base-100 flex gap-0.5 rounded-md p-0.5', className)}
		>
			{children}
		</BaseToggleGroup>
	);
};

export interface TToggleGroupProps {
	value: string | undefined;
	onValueChange: (value: string) => void;
	className?: string;
	children: React.ReactNode;
}

const ToggleGroupItem: React.FC<TToggleGroupItemProps> = (props) => {
	const { value, className, children, ...rest } = props;

	return (
		<Toggle
			value={value}
			className={cn(
				'text-base-500 flex size-8 items-center justify-center rounded transition-colors select-none',
				'hover:text-base-700',
				'focus-visible:outline-primary focus-visible:outline-2 focus-visible:-outline-offset-1',
				'data-pressed:bg-base-0 data-pressed:text-base-900 data-pressed:shadow-sm',
				className
			)}
			{...rest}
		>
			{children}
		</Toggle>
	);
};

export interface TToggleGroupItemProps extends Omit<
	React.ComponentProps<typeof Toggle>,
	'className'
> {
	value: string;
	className?: string;
	children: React.ReactNode;
}

export const ToggleGroup = Object.assign(ToggleGroupRoot, {
	Item: ToggleGroupItem
});
