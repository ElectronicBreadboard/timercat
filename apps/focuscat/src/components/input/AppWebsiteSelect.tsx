import React from 'react';
import { specta } from '@/environment';
import { cn, toTuple } from '@/lib';
import { MultiSelect } from './MultiSelect';
import { useMultiSelect } from './use-multi-select';

// MARK: - Component

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
		onSearch: handleSearch
	});

	return (
		<MultiSelect.Root {...multiSelect.getRootProps()}>
			<MultiSelect.Container className={className} {...multiSelect.getContainerProps()}>
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
							<MultiSelect.Empty>No results for "{multiSelect.query}"</MultiSelect.Empty>
						)}

						{multiSelect.results.map((result, index) => (
							<ResultItem
								key={result.id}
								result={result}
								onSelect={() => multiSelect.select(result)}
								{...multiSelect.getItemProps(index)}
							/>
						))}
					</MultiSelect.Popup>
				</MultiSelect.Positioner>
			</MultiSelect.Portal>
		</MultiSelect.Root>
	);
};

// MARK: - Subcomponents

const Chip: React.FC<{ item: TSelectedItem; onRemove: () => void }> = ({ item, onRemove }) => {
	const isApp = item.itemType === 'app';

	return (
		<span
			className={cn(
				'inline-flex items-center gap-1.5 rounded-md py-0.5 pl-1.5 pr-1 text-sm',
				isApp ? 'bg-blue-100 text-blue-800' : 'bg-violet-100 text-violet-800'
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
				<svg width="10" height="10" viewBox="0 0 10 10" fill="none">
					<path d="M2 2L8 8M8 2L2 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
				</svg>
			</button>
		</span>
	);
};

interface TResultItemProps {
	result: TSelectedItem;
	onSelect: () => void;
	'data-highlighted'?: true;
	onMouseEnter?: () => void;
}

const ResultItem: React.FC<TResultItemProps> = (props) => {
	const { result, onSelect, 'data-highlighted': highlighted, onMouseEnter } = props;
	const isApp = result.itemType === 'app';

	return (
		<div
			className={cn(
				'flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm',
				isApp ? 'hover:bg-blue-50' : 'hover:bg-violet-50',
				highlighted && (isApp ? 'bg-blue-50' : 'bg-violet-50')
			)}
			onClick={onSelect}
			onMouseDown={(e) => e.preventDefault()}
			onMouseEnter={onMouseEnter}
			data-highlighted={highlighted}
		>
			<ItemIcon icon={result.icon} itemType={result.itemType} />
			<span className="flex-1 truncate">{result.name}</span>
			<span
				className={cn(
					'rounded px-1.5 py-0.5 text-xs',
					isApp ? 'bg-blue-100 text-blue-700' : 'bg-violet-100 text-violet-700'
				)}
			>
				{result.itemType}
			</span>
		</div>
	);
};

const ItemIcon: React.FC<{ icon?: string | null; itemType: specta.ItemType; size?: number }> = ({
	icon,
	itemType,
	size = 20
}) => {
	if (icon != null) {
		return (
			<img src={icon} alt="" width={size} height={size} className="shrink-0 rounded-sm object-contain" />
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

// MARK: - Types

export interface TSelectedItem {
	id: string;
	name: string;
	itemType: specta.ItemType;
	icon?: string | null;
}

export interface TAppWebsiteSelectProps {
	value: TSelectedItem[];
	onChange: (items: TSelectedItem[]) => void;
	placeholder?: string;
	includeApps?: boolean;
	includeWebsites?: boolean;
	className?: string;
}
