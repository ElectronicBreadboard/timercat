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
		popupSide = 'bottom',
		className
	} = props;

	const handleSearch = React.useCallback(
		async (query: string): Promise<TSelectedItem[]> => {
			const [areSearchResultsOk, , searchResults] = toTuple(
				await specta.commands.search({
					query,
					includeApps,
					includeWebsites,
					includeIcons: true,
					limit: 20
				})
			);

			if (areSearchResultsOk) {
				return searchResults.map((result): TSelectedItem => {
					switch (result.type) {
						case 'app':
							return {
								id: result.app.id,
								type: 'app',
								bundleId: result.app.bundleId,
								name: result.app.name,
								icon: result.app.icon,
								color: result.app.color
							};
						case 'website':
							return {
								id: result.website.id,
								type: 'website',
								domain: result.website.domain,
								name: result.website.name,
								icon: result.website.icon,
								color: result.website.color
							};
					}
				});
			}
			return [];
		},
		[includeApps, includeWebsites]
	);

	const multiSelect = useMultiSelect({
		value,
		onChange,
		onSearch: handleSearch,
		filterSelected: false,
		emptyResults: value
	});

	const isShowingSelected = !multiSelect.query && !multiSelect.isSearching && value.length > 0;

	return (
		<MultiSelect.Root {...multiSelect.getRootProps()}>
			<MultiSelect.Container
				size="sm"
				className={cn('max-h-24 overflow-y-auto', className)}
				{...multiSelect.getContainerProps()}
			>
				{value.map((item) => (
					<Chip key={item.id} item={item} onRemove={() => multiSelect.remove(item.id)} />
				))}
				<MultiSelect.Input
					{...multiSelect.getInputProps()}
					size="sm"
					placeholder={value.length === 0 ? placeholder : ''}
				/>
			</MultiSelect.Container>

			<MultiSelect.Portal>
				<MultiSelect.Positioner side={popupSide}>
					<MultiSelect.Popup {...multiSelect.getPopupProps()}>
						<MultiSelect.HelperText>
							{multiSelect.isSearching
								? 'Searching...'
								: isShowingSelected
									? 'Selected'
									: 'Select an app or website'}
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
	popupSide?: 'top' | 'bottom';
	className?: string;
}

export type TSelectedApp = {
	id: string;
	type: 'app';
	bundleId: string;
	name?: string | null;
	icon?: string | null;
	color?: string | null;
};

export type TSelectedWebsite = {
	id: string;
	type: 'website';
	domain: string;
	name?: string | null;
	icon?: string | null;
	color?: string | null;
};

export type TSelectedItem = TSelectedApp | TSelectedWebsite;

const Chip: React.FC<TChipProps> = (props) => {
	const { item, onRemove } = props;

	const displayName = React.useMemo(() => {
		switch (item.type) {
			case 'app':
				return item.name ?? item.bundleId;
			case 'website':
				return item.name ?? item.domain;
		}
	}, [item]);

	return (
		<span
			className={cn(
				'inline-flex items-center gap-1.5 rounded-md py-0.5 pr-1 pl-1.5 text-sm',
				item.type === 'app'
					? 'bg-blue-500/20 text-blue-700 dark:text-blue-300'
					: 'bg-violet-500/20 text-violet-700 dark:text-violet-300'
			)}
		>
			<ItemIcon item={item} size={16} />
			<span className="max-w-32 truncate">{displayName}</span>
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

	const displayName = React.useMemo(() => {
		switch (result.type) {
			case 'app':
				return result.name ?? result.bundleId;
			case 'website':
				return result.name ?? result.domain;
		}
	}, [result]);

	return (
		<div
			className={cn(
				'flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm text-(--color-base-900)',
				highlighted && (result.type === 'app' ? 'bg-blue-500/10' : 'bg-violet-500/10')
			)}
			onClick={onToggle}
			onMouseDown={(e) => e.preventDefault()}
			onPointerMove={onPointerMove}
			data-highlighted={highlighted}
		>
			<ItemIcon item={result} />
			<span className="flex-1 truncate">{displayName}</span>
			<span className="flex items-center gap-1">
				{selected && (
					<span className="flex h-5 w-5 items-center justify-center rounded bg-green-500/20 text-green-600">
						<CheckIcon size={12} />
					</span>
				)}
				<span
					className={cn(
						'rounded px-1.5 py-0.5 text-xs',
						result.type === 'app'
							? 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
							: 'bg-violet-500/20 text-violet-600 dark:text-violet-400'
					)}
				>
					{result.type}
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
	const { item, size = 20 } = props;

	if (item.icon != null) {
		return (
			<img
				src={item.icon}
				alt=""
				width={size}
				height={size}
				className="shrink-0 rounded-sm object-contain"
			/>
		);
	}

	return (
		<div
			className={cn(
				'flex shrink-0 items-center justify-center rounded-sm',
				item.type === 'app' ? 'bg-blue-200 text-blue-600' : 'bg-violet-200 text-violet-600'
			)}
			style={{ width: size, height: size }}
		>
			<span className="text-[10px] font-medium">{item.type === 'app' ? 'A' : 'W'}</span>
		</div>
	);
};

interface TItemIconProps {
	item: TSelectedItem;
	size?: number;
}
