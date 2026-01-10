import { Menu } from '@base-ui/react/menu';
import { ChevronDownIcon } from 'lucide-react';
import React from 'react';
import { specta } from '@/environment';
import { cn } from '@/lib';

export const FocusSelector: React.FC<TFocusSelectorProps> = (props) => {
	const { categories, selected, onSelect, disabled = false, className } = props;

	return (
		<Menu.Root>
			<Menu.Trigger
				disabled={disabled}
				className={cn(
					'flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm transition-colors hover:border-gray-300',
					disabled && 'cursor-not-allowed opacity-50',
					className
				)}
			>
				{selected != null && (
					<span className="size-2 rounded-full" style={{ backgroundColor: selected.color }} />
				)}
				<span className="text-gray-900">{selected?.name ?? 'Select focus'}</span>
				<ChevronDownIcon size={14} className="text-gray-400" />
			</Menu.Trigger>

			<Menu.Portal>
				<Menu.Positioner sideOffset={8} className="z-50">
					<Menu.Popup className="min-w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
						{categories.map((category) => (
							<Menu.Item
								key={category.id}
								onClick={() => onSelect(category)}
								className="flex cursor-pointer items-center gap-2 px-4 py-2 text-sm text-gray-900 transition-colors outline-none hover:bg-gray-50"
							>
								<span className="size-2 rounded-full" style={{ backgroundColor: category.color }} />
								<span>{category.name}</span>
							</Menu.Item>
						))}
					</Menu.Popup>
				</Menu.Positioner>
			</Menu.Portal>
		</Menu.Root>
	);
};

interface TFocusSelectorProps {
	categories: specta.FocusCategory[];
	selected: specta.FocusCategory | null;
	onSelect: (category: specta.FocusCategory | null) => void;
	disabled?: boolean;
	className?: string;
}
