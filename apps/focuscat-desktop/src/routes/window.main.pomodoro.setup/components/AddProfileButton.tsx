import { cn, PlusIcon, Popover } from '@repo/ui';
import React from 'react';
import { specta } from '@/environment';

export const AddProfileButton: React.FC<TAddProfileButtonProps> = (props) => {
	const { profiles, onAdd } = props;
	const [open, setOpen] = React.useState(false);

	return (
		<Popover.Root open={open} onOpenChange={setOpen}>
			<Popover.Trigger
				className={cn(
					'inline-flex h-6 w-6 items-center justify-center rounded-md',
					'border-base-200 bg-base-50 text-base-500 border',
					'hover:bg-base-100 hover:text-base-700 transition-colors duration-100',
					'focus-visible:ring-primary outline-none focus-visible:ring-2'
				)}
			>
				<PlusIcon size={14} />
			</Popover.Trigger>
			<Popover.Content side="bottom" sideOffset={4} className="min-w-44 overflow-hidden py-1.5">
				{profiles.map((p) => (
					<button
						key={p.id}
						type="button"
						className={cn(
							'flex w-full items-center gap-2.5 px-3 py-2 text-sm',
							'text-base-700 hover:bg-base-100 transition-colors duration-100'
						)}
						onClick={() => {
							onAdd(p.id);
							setOpen(false);
						}}
					>
						<span
							className="size-3 shrink-0 rounded-full"
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
