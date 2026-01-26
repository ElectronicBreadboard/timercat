import { Popover } from '@base-ui/react/popover';
import React from 'react';
import { specta } from '@/environment';
import { cn, toTuple } from '@/lib';

// MARK: - Styles

const baseContainerStyles =
	'flex flex-wrap items-center gap-1.5 min-h-10 p-2 bg-base-100 cursor-text overflow-hidden outline-none';

const containerClosedStyles = cn(
	baseContainerStyles,
	'rounded-md ring-2 ring-base-200 focus-within:ring-primary'
);

// clip-path: inset(top right bottom left) - negative values extend beyond element to show ring
const containerOpenStyles = cn(
	baseContainerStyles,
	'ring-2 ring-primary',
	// Bottom position (default)
	'rounded-t-md rounded-b-none border-b border-base-200 [clip-path:inset(-2px_-2px_0_-2px)]',
	// Top position
	'data-[side=top]:rounded-b-md data-[side=top]:rounded-t-none',
	'data-[side=top]:border-b-0 data-[side=top]:border-t',
	'data-[side=top]:[clip-path:inset(0_-2px_-2px_-2px)]'
);

const popupStyles = cn(
	'w-[var(--anchor-width)] max-h-64 overflow-y-auto bg-white ring-2 ring-primary outline-none',
	'group flex flex-col',
	// Bottom position (default)
	'rounded-b-md rounded-t-none [clip-path:inset(0_-2px_-2px_-2px)]',
	// Top position
	'data-[side=top]:flex-col-reverse',
	'data-[side=top]:rounded-t-md data-[side=top]:rounded-b-none',
	'data-[side=top]:[clip-path:inset(-2px_-2px_0_-2px)]'
);

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

	const [open, setOpen] = React.useState(false);
	const [query, setQuery] = React.useState('');
	const [results, setResults] = React.useState<specta.SearchResultDto[]>([]);
	const [isSearching, setIsSearching] = React.useState(false);
	const [side, setSide] = React.useState<'top' | 'bottom'>('bottom');

	const inputRef = React.useRef<HTMLInputElement>(null);
	const popupRef = React.useRef<HTMLDivElement>(null);
	const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

	const showDropdown = open && (query.trim() !== '' || isSearching);

	// MARK: - Actions

	const handleSelect = React.useCallback(
		(result: specta.SearchResultDto) => {
			onChange([
				...value,
				{ id: result.id, name: result.name, itemType: result.itemType, icon: result.icon }
			]);
			setQuery('');
			setResults([]);
			inputRef.current?.focus();
		},
		[value, onChange]
	);

	const handleRemove = React.useCallback(
		(id: string) => {
			onChange(value.filter((item) => item.id !== id));
			inputRef.current?.focus();
		},
		[value, onChange]
	);

	const handleContainerClick = React.useCallback(() => {
		inputRef.current?.focus();
	}, []);

	const handleInputFocus = React.useCallback(() => {
		setOpen(true);
	}, []);

	const handleInputBlur = React.useCallback((e: React.FocusEvent) => {
		if ((e.relatedTarget as HTMLElement | null)?.closest('[data-popup]')) {
			return;
		}
		setTimeout(() => setOpen(false), 150);
	}, []);

	const handleInputKeyDown = React.useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === 'Backspace' && query === '' && value.length > 0) {
				onChange(value.slice(0, -1));
			}
			if (e.key === 'Escape') {
				setOpen(false);
				inputRef.current?.blur();
			}
		},
		[query, value, onChange]
	);

	// MARK: - Effects

	React.useEffect(() => {
		if (!open) {
			setQuery('');
			setResults([]);
		}
	}, [open]);

	// Debounced search
	React.useEffect(() => {
		if (debounceRef.current != null) {
			clearTimeout(debounceRef.current);
		}

		if (query.trim() === '') {
			setResults([]);
			setIsSearching(false);
			return;
		}

		setIsSearching(true);
		debounceRef.current = setTimeout(async () => {
			const [ok, , data] = toTuple(
				await specta.commands.search({
					query: query.trim(),
					includeApps,
					includeWebsites,
					includeIcons: true,
					limit: 20
				})
			);

			if (ok && data != null) {
				const selectedIds = new Set(value.map((v) => v.id));
				setResults(data.filter((r) => !selectedIds.has(r.id)));
			}
			setIsSearching(false);
		}, 200);

		return () => {
			if (debounceRef.current != null) {
				clearTimeout(debounceRef.current);
			}
		};
	}, [query, includeApps, includeWebsites, value]);

	// Sync popup position to container for seamless styling
	React.useLayoutEffect(() => {
		if (!showDropdown) {
			setSide('bottom');
			return;
		}

		let frameId: number;
		let observer: MutationObserver | null = null;

		const updateSide = () => {
			const el = popupRef.current;
			if (el == null) {
				frameId = requestAnimationFrame(updateSide);
				return;
			}

			const dataSide = el.getAttribute('data-side') as 'top' | 'bottom' | null;
			if (dataSide != null) {
				setSide(dataSide);
			}

			if (observer == null) {
				observer = new MutationObserver(() => {
					const newSide = el.getAttribute('data-side') as 'top' | 'bottom' | null;
					if (newSide != null) {
						setSide(newSide);
					}
				});
				observer.observe(el, { attributes: true, attributeFilter: ['data-side'] });
			}
		};

		frameId = requestAnimationFrame(updateSide);

		return () => {
			cancelAnimationFrame(frameId);
			observer?.disconnect();
		};
	}, [showDropdown]);

	// MARK: - UI

	return (
		<Popover.Root open={showDropdown}>
			<Popover.Trigger
				className={cn(showDropdown ? containerOpenStyles : containerClosedStyles, className)}
				onClick={handleContainerClick}
				render={<div />}
				data-side={showDropdown ? side : undefined}
			>
				{value.map((item) => (
					<Chip key={item.id} item={item} onRemove={() => handleRemove(item.id)} />
				))}
				<input
					ref={inputRef}
					type="text"
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					onFocus={handleInputFocus}
					onBlur={handleInputBlur}
					onKeyDown={handleInputKeyDown}
					placeholder={value.length === 0 ? placeholder : ''}
					className="min-w-20 flex-1 border-none bg-transparent py-0.5 text-sm shadow-none ring-0 outline-none placeholder:text-base-400"
				/>
			</Popover.Trigger>

			<Popover.Portal>
				<Popover.Positioner side="bottom" sideOffset={0} collisionPadding={8}>
					<Popover.Popup ref={popupRef} className={popupStyles} data-popup initialFocus={false}>
						<div className="border-b border-base-100 px-3 py-2 text-xs text-base-500 group-data-[side=top]:border-t group-data-[side=top]:border-b-0">
							{isSearching ? 'Searching...' : 'Select an app or website'}
						</div>

						{!isSearching && results.length === 0 && query.trim() !== '' && (
							<div className="px-3 py-3 text-sm text-base-500">No results for "{query}"</div>
						)}

						{results.map((result) => (
							<ResultItem key={result.id} result={result} onSelect={() => handleSelect(result)} />
						))}
					</Popover.Popup>
				</Popover.Positioner>
			</Popover.Portal>
		</Popover.Root>
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

const ResultItem: React.FC<{ result: specta.SearchResultDto; onSelect: () => void }> = ({
	result,
	onSelect
}) => {
	const isApp = result.itemType === 'app';

	return (
		<div
			className={cn(
				'flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm',
				isApp ? 'hover:bg-blue-50' : 'hover:bg-violet-50'
			)}
			onClick={onSelect}
			onMouseDown={(e) => e.preventDefault()}
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
