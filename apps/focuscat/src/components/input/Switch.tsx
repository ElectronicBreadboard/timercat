import { Switch as BaseSwitch } from '@base-ui/react/switch';
import { cva, type VariantProps } from 'class-variance-authority';
import React from 'react';
import { cn } from '@/lib';

const switchRootVariants = cva(
	[
		'group relative flex cursor-pointer items-center rounded-full p-px transition-colors',
		'bg-gray-200 data-checked:bg-blue-500',
		'data-disabled:cursor-not-allowed data-disabled:opacity-50'
	],
	{
		variants: {
			size: {
				sm: 'h-5 w-9',
				md: 'h-6 w-10',
				lg: 'h-7 w-12'
			}
		},
		defaultVariants: {
			size: 'md'
		}
	}
);

const switchThumbVariants = cva(
	[
		'aspect-square h-full rounded-full bg-white shadow transition-transform',
		'group-data-unchecked:translate-x-0'
	],
	{
		variants: {
			size: {
				sm: 'data-checked:translate-x-4',
				md: 'data-checked:translate-x-4',
				lg: 'data-checked:translate-x-5'
			}
		},
		defaultVariants: {
			size: 'md'
		}
	}
);

export const Switch: React.FC<TSwitchProps> = (props) => {
	const { checked, onCheckedChange, size = 'md', disabled = false, className } = props;

	return (
		<BaseSwitch.Root
			checked={checked}
			onCheckedChange={onCheckedChange}
			disabled={disabled}
			className={cn(switchRootVariants({ size }), className)}
		>
			<BaseSwitch.Thumb className={switchThumbVariants({ size })} />
		</BaseSwitch.Root>
	);
};

export interface TSwitchProps extends VariantProps<typeof switchRootVariants> {
	checked: boolean;
	onCheckedChange: (checked: boolean) => void;
	disabled?: boolean;
	className?: string;
}
