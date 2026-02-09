import React from 'react';
import { PlusIcon, Popover } from '@/components';
import { specta } from '@/environment';
import { cn } from '@/lib';

export const AddProfileButton: React.FC<TAddProfileButtonProps> = (props) => {
	const { profiles, onAdd } = props;
	const [open, setOpen] = React.useState(false);

	return (
		<Popover.Root open={open} onOpenChange={setOpen}>
			<Popover.Trigger
				className={cn(
					'inline-flex size-5 items-center justify-center rounded-full',
					'border-base-200 bg-base-50 text-base-500 border',
					'hover:bg-base-100 hover:text-base-700 transition-colors duration-100',
					'focus-visible:ring-primary outline-none focus-visible:ring-2'
				)}
			>
				<PlusIcon size={12} />
			</Popover.Trigger>
			<Popover.Content side="bottom" sideOffset={4} className="min-w-36 overflow-hidden py-1">
				{profiles.map((p) => (
					<button
						key={p.id}
						type="button"
						className={cn(
							'flex w-full items-center gap-2 px-3 py-1.5 text-xs',
							'text-base-700 hover:bg-base-100 transition-colors duration-100'
						)}
						onClick={() => {
							onAdd(p.id);
							setOpen(false);
						}}
					>
						<span
							className="size-2.5 shrink-0 rounded-full"
							style={{
								backgroundColor: p.color ?? 'var(--color-base-400)'
							}}
						/>
						{p.name}
					</button>
				))}
			</Popover.Content>
		</Popover.Root>
	);
};

interface TAddProfileButtonProps {
	profiles: specta.FocusProfileDto[];
	onAdd: (id: number) => void;
}
