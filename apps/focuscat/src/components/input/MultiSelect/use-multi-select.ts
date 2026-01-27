import React from 'react';
import { useDebouncedSearch } from './use-debounced-search';
import { usePopupSideObserver } from './use-popup-side-observer';

/**
 * Headless hook for building multi-select components with async search.
 *
 * Features:
 * - Debounced async search with stale response handling
 * - Keyboard navigation (arrows, enter, escape, backspace)
 * - Visual navigation that adapts to popup position
 * - Focus management
 * - Connected input/popup visual coordination
 *
 * @example
 * ```tsx
 * const multiSelect = useMultiSelect({
 *   value: selectedItems,
 *   onChange: setSelectedItems,
 *   onSearch: async (query) => api.search(query)
 * });
 *
 * return (
 *   <MultiSelect.Root {...multiSelect.getRootProps()}>
 *     <MultiSelect.Container {...multiSelect.getContainerProps()}>
 *       {value.map(item => <Chip key={item.id} />)}
 *       <MultiSelect.Input {...multiSelect.getInputProps()} />
 *     </MultiSelect.Container>
 *     <MultiSelect.Portal>
 *       <MultiSelect.Popup {...multiSelect.getPopupProps()}>
 *         {multiSelect.results.map((item, i) => (
 *           <Item {...multiSelect.getItemProps(i)} />
 *         ))}
 *       </MultiSelect.Popup>
 *     </MultiSelect.Portal>
 *   </MultiSelect.Root>
 * );
 * ```
 */
export function useMultiSelect<GItem extends TMultiSelectItem>(
	options: TUseMultiSelectOptions<GItem>
) {
	const {
		value,
		onChange,
		onSearch,
		debounceMs = 200,
		filterSelected = true,
		disabled = false
	} = options;

	// Refs
	const inputRef = React.useRef<HTMLInputElement | null>(null);
	const popupRef = React.useRef<HTMLDivElement | null>(null);

	// Stable IDs for ARIA
	const id = React.useId();
	const popupId = `multiselect-popup-${id}`;
	const getItemId = React.useCallback((index: number) => `multiselect-item-${id}-${index}`, [id]);

	// State
	const [isOpen, setIsOpen] = React.useState(false);
	const [query, setQuery] = React.useState('');
	const [highlightedIndex, setHighlightedIndex] = React.useState(0);
	// Tracks popup position for: 1) visual keyboard nav, 2) container border styling
	const [side, setSide] = React.useState<'top' | 'bottom'>('bottom');

	// Debounced search
	const selectedIds = React.useMemo(() => new Set(value.map((v) => v.id)), [value]);
	const searchFilter = React.useCallback(
		(item: GItem) => !filterSelected || !selectedIds.has(item.id),
		[filterSelected, selectedIds]
	);
	const {
		results,
		isSearching,
		clear: clearSearch
	} = useDebouncedSearch<GItem>({
		query,
		onSearch,
		debounceMs,
		filter: searchFilter,
		enabled: isOpen && !disabled
	});

	// Computed
	const hasQuery = query.trim() !== '';
	const showPopup = isOpen && (hasQuery || isSearching);
	const inputCollapsed = !isOpen && value.length > 0;
	const showEmpty = !isSearching && results.length === 0 && hasQuery;

	// MARK: - Actions

	const select = React.useCallback(
		(item: GItem) => {
			onChange([...value, item]);
			setQuery('');
			clearSearch();
			setHighlightedIndex(0);
			inputRef.current?.focus();
		},
		[value, onChange, clearSearch]
	);

	const remove = React.useCallback(
		(id: string) => {
			onChange(value.filter((item) => item.id !== id));
			inputRef.current?.focus();
		},
		[value, onChange]
	);

	const clear = React.useCallback(() => {
		onChange([]);
		inputRef.current?.focus();
	}, [onChange]);

	const close = React.useCallback(() => {
		setIsOpen(false);
		inputRef.current?.blur();
	}, []);

	// MARK: - Event Handlers

	const handleContainerClick = React.useCallback(() => {
		inputRef.current?.focus();
	}, []);

	const handleInputFocus = React.useCallback(() => {
		if (!disabled) {
			setIsOpen(true);
		}
	}, [disabled]);

	const handleInputBlur = React.useCallback((e: React.FocusEvent) => {
		// relatedTarget tells us where focus went - if it's inside popup, keep open
		// (popup is in Portal so can't use DOM containment check)
		const focusedInsidePopup = (e.relatedTarget as HTMLElement | null)?.closest('[data-popup]');
		if (focusedInsidePopup == null) {
			setIsOpen(false);
		}
	}, []);

	const handleOpenChange = React.useCallback((open: boolean) => {
		setIsOpen(open);
	}, []);

	const handleQueryChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		setQuery(e.target.value);
	}, []);

	const handleInputKeyDown = React.useCallback(
		(e: React.KeyboardEvent) => {
			// ArrowDown should always move highlight visually downward on screen.
			// When popup is above input (side=top), CSS reverses list order via flex-col-reverse,
			// so we invert the index direction to maintain visual consistency.
			const isReversed = side === 'top';

			switch (e.key) {
				case 'ArrowDown':
					e.preventDefault();
					if (results.length > 0) {
						setHighlightedIndex((prev) =>
							isReversed ? Math.max(0, prev - 1) : Math.min(results.length - 1, prev + 1)
						);
					}
					break;
				case 'ArrowUp':
					e.preventDefault();
					if (results.length > 0) {
						setHighlightedIndex((prev) =>
							isReversed ? Math.min(results.length - 1, prev + 1) : Math.max(0, prev - 1)
						);
					}
					break;
				case 'Enter': {
					e.preventDefault();
					const item = results[highlightedIndex];
					if (item != null) {
						select(item);
					}
					break;
				}
				case 'Escape':
					setIsOpen(false);
					inputRef.current?.blur();
					break;
				case 'Backspace':
					if (query === '' && value.length > 0) {
						onChange(value.slice(0, -1));
					}
					break;
			}
		},
		[query, value, onChange, results, highlightedIndex, select, side]
	);

	// MARK: - Props Getters

	const getRootProps = React.useCallback(
		() => ({
			open: showPopup,
			onOpenChange: handleOpenChange
		}),
		[showPopup, handleOpenChange]
	);

	const getContainerProps = React.useCallback(
		() => ({
			open: showPopup,
			side: showPopup ? side : undefined,
			onClick: handleContainerClick
		}),
		[showPopup, side, handleContainerClick]
	);

	const highlightedItemId = results.length > 0 ? getItemId(highlightedIndex) : undefined;

	const getInputProps = React.useCallback(
		() => ({
			'ref': inputRef,
			'value': query,
			'onChange': handleQueryChange,
			'onFocus': handleInputFocus,
			'onBlur': handleInputBlur,
			'onKeyDown': handleInputKeyDown,
			'data-collapsed': inputCollapsed || undefined,
			'disabled': disabled || undefined,
			// ARIA: combobox pattern
			'role': 'combobox',
			'aria-expanded': showPopup,
			'aria-controls': showPopup ? popupId : undefined,
			'aria-activedescendant': showPopup ? highlightedItemId : undefined,
			'aria-autocomplete': 'list' as const
		}),
		[
			query,
			handleQueryChange,
			handleInputFocus,
			handleInputBlur,
			handleInputKeyDown,
			inputCollapsed,
			disabled,
			showPopup,
			popupId,
			highlightedItemId
		]
	);

	const getPopupProps = React.useCallback(
		() => ({
			ref: popupRef,
			id: popupId,
			role: 'listbox' as const
		}),
		[popupId]
	);

	const getItemProps = React.useCallback(
		(index: number) => ({
			'id': getItemId(index),
			'role': 'option' as const,
			'aria-selected': index === highlightedIndex,
			'data-highlighted': index === highlightedIndex || undefined,
			// onPointerMove (not onMouseEnter) to only fire on actual movement, not hidden cursor
			'onPointerMove': () => {
				if (highlightedIndex !== index) {
					setHighlightedIndex(index);
				}
			}
		}),
		[highlightedIndex, getItemId]
	);

	// MARK: - Effects

	// Reset state when closed
	React.useEffect(() => {
		if (!isOpen) {
			setQuery('');
			clearSearch();
			setHighlightedIndex(0);
		}
	}, [isOpen, clearSearch]);

	// Reset highlight when results change
	React.useEffect(() => {
		setHighlightedIndex(0);
	}, [results]);

	// Scroll highlighted item into view during keyboard navigation
	React.useEffect(() => {
		if (!showPopup) return;
		const highlighted = popupRef.current?.querySelector('[data-highlighted]');
		highlighted?.scrollIntoView({ block: 'nearest' });
	}, [highlightedIndex, showPopup]);

	// Track popup side for connected visual (base-ui sets data-side on Popup)
	usePopupSideObserver(popupRef, showPopup, setSide);

	return {
		// State
		showPopup,
		query,
		results,
		isSearching,
		showEmpty,

		// Actions
		select,
		remove,
		clear,
		close,

		// Props getters
		getRootProps,
		getContainerProps,
		getInputProps,
		getPopupProps,
		getItemProps
	} as const;
}

/** Minimum shape for selectable items (extend with your own fields) */
export interface TMultiSelectItem {
	id: string;
}

export interface TUseMultiSelectOptions<GItem extends TMultiSelectItem> {
	/** Currently selected items */
	value: GItem[];
	/** Called when selection changes */
	onChange: (items: GItem[]) => void;
	/** Async function to search for items (should be memoized with useCallback) */
	onSearch: (query: string) => Promise<GItem[]>;
	/** Debounce delay in milliseconds (default: 200) */
	debounceMs?: number;
	/** Whether to filter out already-selected items from results (default: true) */
	filterSelected?: boolean;
	/** Whether the input is disabled (default: false) */
	disabled?: boolean;
}
