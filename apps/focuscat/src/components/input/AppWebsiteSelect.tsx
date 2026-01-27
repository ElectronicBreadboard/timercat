import React from 'react';
import { CheckIcon, XIcon } from '@/components';
import { specta } from '@/environment';
import { cn, toTuple } from '@/lib';
import { MultiSelect, useMultiSelect } from './MultiSelect';

/**
 * Multi-select input for apps and websites, similar to Notion's tag selector.
 * Shows selected items as chips with inline search.
 */
export const AppWebsiteSelect: React.FC<TAppWebsiteSelectProps> = (props) => {
	const {
		value,
		onChange,
		placeholder = 'Add apps or websites...',
		includeApps = true,
		includeWebsites = true,
		className
	} = props;

	const handleSearch = React.useCallback(
		async (query: string): Promise<TSelectedItem[]> => {
			const [ok, , data] = toTuple(
				await specta.commands.search({
					query,
					includeApps,
					includeWebsites,
					includeIcons: true,
					limit: 20
				})
			);

			if (ok && data != null) {
				return data.map((r) => ({
					id: r.id,
					name: r.name,
					itemType: r.itemType,
					icon: r.icon
				}));
			}
			return [];
		},
		[includeApps, includeWebsites]
	);

	const multiSelect = useMultiSelect({
		value,
		onChange,
		onSearch: handleSearch,
		filterSelected: false
	});

	return (
		<MultiSelect.Root {...multiSelect.getRootProps()}>
			<MultiSelect.Container
				className={cn('max-h-24 overflow-y-auto', className)}
				{...multiSelect.getContainerProps()}
			>
				{value.map((item) => (
					<Chip key={item.id} item={item} onRemove={() => multiSelect.remove(item.id)} />
				))}
				<MultiSelect.Input
					{...multiSelect.getInputProps()}
					placeholder={value.length === 0 ? placeholder : ''}
				/>
			</MultiSelect.Container>

			<MultiSelect.Portal>
				<MultiSelect.Positioner>
					<MultiSelect.Popup {...multiSelect.getPopupProps()}>
						<MultiSelect.HelperText>
							{multiSelect.isSearching ? 'Searching...' : 'Select an app or website'}
						</MultiSelect.HelperText>

						{multiSelect.showEmpty && (
							<MultiSelect.Empty>No results for &quot;{multiSelect.query}&quot;</MultiSelect.Empty>
						)}

						{multiSelect.results.map((result, index) => (
							<ResultItem
								key={result.id}
								result={result}
								onToggle={() => multiSelect.toggle(result)}
								{...multiSelect.getItemProps(index)}
							/>
						))}
					</MultiSelect.Popup>
				</MultiSelect.Positioner>
			</MultiSelect.Portal>
		</MultiSelect.Root>
	);
};

export interface TAppWebsiteSelectProps {
	value: TSelectedItem[];
	onChange: (items: TSelectedItem[]) => void;
	placeholder?: string;
	includeApps?: boolean;
	includeWebsites?: boolean;
	className?: string;
}

export interface TSelectedItem {
	id: string;
	name: string;
	itemType: specta.ItemType;
	icon?: string | null;
}

const Chip: React.FC<TChipProps> = (props) => {
	const { item, onRemove } = props;
	const isApp = item.itemType === 'app';

	return (
		<span
			className={cn(
				'inline-flex items-center gap-1.5 rounded-md py-0.5 pr-1 pl-1.5 text-sm',
				isApp
					? 'bg-blue-500/20 text-blue-700 dark:text-blue-300'
					: 'bg-violet-500/20 text-violet-700 dark:text-violet-300'
			)}
		>
			<ItemIcon icon={item.icon} itemType={item.itemType} size={16} />
			<span className="max-w-32 truncate">{item.name}</span>
			<button
				type="button"
				className="inline-flex h-4 w-4 cursor-pointer items-center justify-center rounded opacity-60 hover:opacity-100"
				onClick={(e) => {
					e.stopPropagation();
					onRemove();
				}}
				onMouseDown={(e) => e.preventDefault()}
			>
				<XIcon size={10} />
			</button>
		</span>
	);
};

interface TChipProps {
	item: TSelectedItem;
	onRemove: () => void;
}

const ResultItem: React.FC<TResultItemProps> = (props) => {
	const { result, selected, onToggle, 'data-highlighted': highlighted, onPointerMove } = props;
	const isApp = result.itemType === 'app';

	return (
		<div
			className={cn(
				'flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm text-(--color-base-900)',
				highlighted && (isApp ? 'bg-blue-500/10' : 'bg-violet-500/10')
			)}
			onClick={onToggle}
			onMouseDown={(e) => e.preventDefault()}
			onPointerMove={onPointerMove}
			data-highlighted={highlighted}
		>
			<ItemIcon icon={result.icon} itemType={result.itemType} />
			<span className="flex-1 truncate">{result.name}</span>
			<span className="flex items-center gap-1">
				{selected && (
					<span className="flex h-5 w-5 items-center justify-center rounded bg-green-500/20 text-green-600">
						<CheckIcon size={12} />
					</span>
				)}
				<span
					className={cn(
						'rounded px-1.5 py-0.5 text-xs',
						isApp
							? 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
							: 'bg-violet-500/20 text-violet-600 dark:text-violet-400'
					)}
				>
					{result.itemType}
				</span>
			</span>
		</div>
	);
};

interface TResultItemProps {
	'result': TSelectedItem;
	'selected': boolean;
	'onToggle': () => void;
	'data-highlighted'?: true;
	'onPointerMove'?: (e: React.PointerEvent) => void;
}

const ItemIcon: React.FC<TItemIconProps> = (props) => {
	const { icon, itemType, size = 20 } = props;

	if (icon != null) {
		return (
			<img
				src={icon}
				alt=""
				width={size}
				height={size}
				className="shrink-0 rounded-sm object-contain"
			/>
		);
	}

	const isApp = itemType === 'app';

	return (
		<div
			className={cn(
				'flex shrink-0 items-center justify-center rounded-sm',
				isApp ? 'bg-blue-200 text-blue-600' : 'bg-violet-200 text-violet-600'
			)}
			style={{ width: size, height: size }}
		>
			<span className="text-[10px] font-medium">{isApp ? 'A' : 'W'}</span>
		</div>
	);
};

interface TItemIconProps {
	icon?: string | null;
	itemType: specta.ItemType;
	size?: number;
}
