import { useFeatureState } from 'feature-react/state';
import React from 'react';
import { Badge, CheckIcon, XIcon } from '@/components';
import { specta } from '@/environment';
import { cn, toTuple } from '@/lib';
import { MultiSelect, useMultiSelect, type MultiSelectCx } from './MultiSelect';

/** Multi-select input for apps/websites, similar to Notion's tag selector. */
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

	const cx = useMultiSelect<TSearchResultItem>({
		value,
		onChange: onChange as (items: TSearchResultItem[]) => void,
		onSearch: React.useCallback(
			async (query: string): Promise<TSearchResultItem[]> => {
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
					return searchResults.map((result): TSearchResultItem => {
						switch (result.type) {
							case 'app':
								return mapApp(result.app);
							case 'website':
								return mapWebsite(result.website);
							case 'group':
								return {
									id: `group:${result.name}`,
									type: 'group',
									name: result.name,
									icon: result.icon,
									members: result.members.map((m): TSelectedItem => {
										switch (m.type) {
											case 'app':
												return mapApp(m.app);
											case 'website':
												return mapWebsite(m.website);
										}
									})
								};
						}
					});
				}
				return [];
			},
			[includeApps, includeWebsites]
		),
		// Groups are resolved into individual items, so onChange only ever receives array of items (not groups)
		resolveItem: React.useCallback((item: TSearchResultItem): TSearchResultItem[] | null => {
			return item.type === 'group' ? item.members : null;
		}, []),
		filterSelected: false,
		emptyResults: value
	});

	const rootProps = cx.useRootProps();

	return (
		<MultiSelect.Root {...rootProps}>
			<InputArea cx={cx} value={value} placeholder={placeholder} className={className} />
			<PopupArea cx={cx} popupSide={popupSide} />
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

type TSearchResultItem = TGroupResult | TSelectedItem;

interface TGroupResult {
	id: string;
	type: 'group';
	name: string;
	icon?: string | null;
	members: TSelectedItem[];
}

export type TSelectedItem = TSelectedApp | TSelectedWebsite;

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

const InputArea: React.FC<TInputAreaProps> = (props) => {
	const {
		cx,
		value,
		placeholder,
		className,
		defaultHeight = 96,
		minHeight = 32,
		maxHeight = 320
	} = props;
	const containerProps = cx.useContainerProps();
	const inputProps = cx.useInputProps();

	return (
		<MultiSelect.Container
			size="sm"
			className={cn('resize-y overflow-y-auto overscroll-contain', className)}
			style={{ height: defaultHeight, minHeight, maxHeight }}
			{...containerProps}
		>
			{value.map((item) => (
				<Chip key={item.id} item={item} onRemove={() => cx.remove(item.id)} />
			))}
			<MultiSelect.Input {...inputProps} size="sm" placeholder={!value.length ? placeholder : ''} />
		</MultiSelect.Container>
	);
};

interface TInputAreaProps {
	cx: MultiSelectCx<TSearchResultItem>;
	value: TSelectedItem[];
	placeholder?: string;
	defaultHeight?: number;
	minHeight?: number;
	maxHeight?: number;
	className?: string;
}

// Memo'd: parent re-renders on every keystroke ($query), but search state only changes after debounce
const PopupArea = React.memo<TPopupAreaProps>(function PopupArea({ cx, popupSide }) {
	const searchResults = useFeatureState(cx.$searchResults);
	const isSearching = useFeatureState(cx.$isSearching);
	const emptyResults = useFeatureState(cx.$emptyResults);
	const popupProps = cx.usePopupProps();

	const hasQuery = cx.hasQuery;
	const results = hasQuery || isSearching ? searchResults : emptyResults;
	const showEmpty = !isSearching && !searchResults.length && hasQuery;
	const isShowingSelected = !hasQuery && !isSearching && emptyResults.length > 0;

	return (
		<MultiSelect.Portal>
			<MultiSelect.Positioner side={popupSide}>
				<MultiSelect.Popup {...popupProps}>
					<MultiSelect.HelperText>
						{isSearching
							? 'Searching...'
							: isShowingSelected
								? 'Selected'
								: 'Select an app or website'}
					</MultiSelect.HelperText>

					{showEmpty && (
						<MultiSelect.Empty>No results for &quot;{cx.query}&quot;</MultiSelect.Empty>
					)}

					{results.map((result, index) => (
						<ResultItem key={result.id} cx={cx} result={result} index={index} />
					))}
				</MultiSelect.Popup>
			</MultiSelect.Positioner>
		</MultiSelect.Portal>
	);
});

interface TPopupAreaProps {
	cx: MultiSelectCx<TSearchResultItem>;
	popupSide?: 'top' | 'bottom';
}

const Chip: React.FC<TChipProps> = (props) => {
	const { item, onRemove } = props;
	const displayName = React.useMemo(() => getItemDisplayName(item), [item]);

	return (
		<Badge
			className={cn(
				'gap-1.5 px-1 text-sm',
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
		</Badge>
	);
};

interface TChipProps {
	item: TSelectedItem;
	onRemove: () => void;
}

const ResultItem: React.FC<TResultItemProps> = (props) => {
	const { cx, result, index } = props;

	const { selected, 'data-highlighted': highlighted, ...ariaProps } = cx.useItemProps(index);
	const displayName = React.useMemo(() => getItemDisplayName(result), [result]);

	return (
		<div
			{...ariaProps}
			className={cn(
				'flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm text-(--color-base-900)',
				highlighted &&
					(result.type === 'group'
						? 'bg-amber-500/10'
						: result.type === 'app'
							? 'bg-blue-500/10'
							: 'bg-violet-500/10')
			)}
			onClick={() => cx.toggle(result)}
			onMouseDown={(e) => e.preventDefault()}
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
				<Badge
					className={
						result.type === 'group'
							? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
							: result.type === 'app'
								? 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
								: 'bg-violet-500/20 text-violet-600 dark:text-violet-400'
					}
				>
					{result.type}
				</Badge>
			</span>
		</div>
	);
};

interface TResultItemProps {
	cx: MultiSelectCx<TSearchResultItem>;
	result: TSearchResultItem;
	index: number;
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
				item.type === 'group'
					? 'bg-amber-200 text-amber-600'
					: item.type === 'app'
						? 'bg-blue-200 text-blue-600'
						: 'bg-violet-200 text-violet-600'
			)}
			style={{ width: size, height: size }}
		>
			<span className="text-[10px] font-medium">
				{item.type === 'group' ? 'G' : item.type === 'app' ? 'A' : 'W'}
			</span>
		</div>
	);
};

interface TItemIconProps {
	item: TSelectedItem | TGroupResult;
	size?: number;
}

function getItemDisplayName(item: TSearchResultItem): string {
	switch (item.type) {
		case 'app':
			return item.name ?? item.bundleId;
		case 'website':
			return item.name ?? item.domain;
		case 'group':
			return item.name;
	}
}

function mapApp(app: {
	id: string;
	bundleId: string;
	name: string | null;
	icon: string | null;
	color: string | null;
}): TSelectedApp {
	return {
		id: app.id,
		type: 'app',
		bundleId: app.bundleId,
		name: app.name,
		icon: app.icon,
		color: app.color
	};
}

function mapWebsite(website: {
	id: string;
	domain: string;
	name: string | null;
	icon: string | null;
	color: string | null;
}): TSelectedWebsite {
	return {
		id: website.id,
		type: 'website',
		domain: website.domain,
		name: website.name,
		icon: website.icon,
		color: website.color
	};
}
