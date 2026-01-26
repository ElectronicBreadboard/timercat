import React from 'react';
import { usePopupViewport } from './use-popup-viewport';

export function useMultiSelect<T extends TMultiSelectItem>(options: TUseMultiSelectOptions<T>) {
	const {
		value,
		onChange,
		onSearch,
		debounceMs = 200,
		filterSelected = true,
		viewportPadding = 16,
		minPopupHeight = 100
	} = options;

	// Refs
	const containerRef = React.useRef<HTMLDivElement | null>(null);
	const inputRef = React.useRef<HTMLInputElement | null>(null);
	const popupRef = React.useRef<HTMLDivElement | null>(null);
	const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
	const searchIdRef = React.useRef(0);
	const blurTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

	// State
	const [isOpen, setIsOpen] = React.useState(false);
	const [query, setQuery] = React.useState('');
	const [results, setResults] = React.useState<T[]>([]);
	const [isSearching, setIsSearching] = React.useState(false);
	const [highlightedIndex, setHighlightedIndex] = React.useState(0);

	// Computed
	const hasQuery = query.trim() !== '';
	const showPopup = isOpen && (hasQuery || isSearching);
	const inputCollapsed = !isOpen && value.length > 0;
	const showEmpty = !isSearching && !results.length && hasQuery;

	const { side } = usePopupViewport({
		enabled: showPopup,
		containerRef,
		popupRef,
		padding: viewportPadding,
		minHeight: minPopupHeight
	});

	// MARK: - Actions

	const select = React.useCallback(
		(item: T) => {
			onChange([...value, item]);
			setQuery('');
			setResults([]);
			setHighlightedIndex(0);
			inputRef.current?.focus();
		},
		[value, onChange]
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

	const handleContainerClick = React.useCallback(() => {
		inputRef.current?.focus();
	}, []);

	const handleInputFocus = React.useCallback(() => {
		setIsOpen(true);
	}, []);

	const handleInputBlur = React.useCallback((e: React.FocusEvent) => {
		const clickedInsidePopup = (e.relatedTarget as HTMLElement | null)?.closest('[data-popup]');
		if (clickedInsidePopup) {
			return;
		}
		// Delay allows click events on results to register before closing
		blurTimeoutRef.current = setTimeout(() => setIsOpen(false), 150);
	}, []);

	const handleInputKeyDown = React.useCallback(
		(e: React.KeyboardEvent) => {
			// Flip direction when popup is on top (visually reversed due to flex-col-reverse)
			const isReversed = side === 'top';

			switch (e.key) {
				case 'ArrowDown':
					e.preventDefault();
					if (results.length > 0) {
						setHighlightedIndex((prev) =>
							isReversed
								? (prev - 1 + results.length) % results.length
								: (prev + 1) % results.length
						);
					}
					break;
				case 'ArrowUp':
					e.preventDefault();
					if (results.length > 0) {
						setHighlightedIndex((prev) =>
							isReversed
								? (prev + 1) % results.length
								: (prev - 1 + results.length) % results.length
						);
					}
					break;
				case 'Enter':
					e.preventDefault();
					if (results.length > 0 && highlightedIndex < results.length) {
						select(results[highlightedIndex] as T);
					}
					break;
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

	const handleQueryChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		setQuery(e.target.value);
	}, []);

	const getRootProps = React.useCallback(
		() => ({
			open: showPopup
		}),
		[showPopup]
	);

	const getContainerProps = React.useCallback(
		() => ({
			ref: containerRef,
			open: showPopup,
			onClick: handleContainerClick,
			side: showPopup ? side : undefined
		}),
		[showPopup, handleContainerClick, side]
	);

	const getInputProps = React.useCallback(
		() => ({
			'ref': inputRef,
			'value': query,
			'onChange': handleQueryChange,
			'onFocus': handleInputFocus,
			'onBlur': handleInputBlur,
			'onKeyDown': handleInputKeyDown,
			'data-collapsed': (inputCollapsed ? true : undefined) as true | undefined
		}),
		[
			query,
			handleQueryChange,
			handleInputFocus,
			handleInputBlur,
			handleInputKeyDown,
			inputCollapsed
		]
	);

	const getPopupProps = React.useCallback(
		() => ({
			'ref': popupRef,
			'data-popup': true as const
		}),
		[]
	);

	const getItemProps = React.useCallback(
		(index: number) => ({
			'data-highlighted': (index === highlightedIndex ? true : undefined) as true | undefined,
			'onMouseEnter': () => setHighlightedIndex(index)
		}),
		[highlightedIndex]
	);

	// MARK: - Effects

	React.useEffect(() => {
		if (!isOpen) {
			setQuery('');
			setResults([]);
			setHighlightedIndex(0);
		}
		// Clear pending blur timeout when open state changes
		if (blurTimeoutRef.current != null) {
			clearTimeout(blurTimeoutRef.current);
			blurTimeoutRef.current = null;
		}
	}, [isOpen]);

	React.useEffect(() => {
		setHighlightedIndex(0);
	}, [results]);

	// Debounced search
	React.useEffect(() => {
		if (debounceRef.current != null) {
			clearTimeout(debounceRef.current);
		}

		const trimmedQuery = query.trim();
		if (!trimmedQuery) {
			setResults([]);
			setIsSearching(false);
			return;
		}

		setIsSearching(true);
		const searchId = ++searchIdRef.current;
		const isStaleResponse = () => searchId !== searchIdRef.current;

		debounceRef.current = setTimeout(async () => {
			try {
				const searchResults = await onSearch(trimmedQuery);
				if (isStaleResponse()) {
					return;
				}
				if (filterSelected) {
					const selectedIds = new Set(value.map((v) => v.id));
					setResults(searchResults.filter((r) => !selectedIds.has(r.id)));
				} else {
					setResults(searchResults);
				}
			} catch {
				if (isStaleResponse()) {
					return;
				}
				setResults([]);
			} finally {
				if (!isStaleResponse()) {
					setIsSearching(false);
				}
			}
		}, debounceMs);

		return () => {
			if (debounceRef.current != null) {
				clearTimeout(debounceRef.current);
			}
		};
	}, [query, onSearch, debounceMs, filterSelected, value]);

	// Cleanup on unmount
	React.useEffect(() => {
		return () => {
			if (blurTimeoutRef.current != null) {
				clearTimeout(blurTimeoutRef.current);
			}
		};
	}, []);

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

export interface TMultiSelectItem {
	id: string;
}

export interface TUseMultiSelectOptions<T extends TMultiSelectItem> {
	value: T[];
	onChange: (items: T[]) => void;
	onSearch: (query: string) => Promise<T[]>;
	debounceMs?: number;
	filterSelected?: boolean;
	/** Minimum gap (px) between popup edge and viewport edge */
	viewportPadding?: number;
	/** Minimum popup height (px) even when viewport space is limited */
	minPopupHeight?: number;
}

/** Inferred return type of useMultiSelect */
export type TUseMultiSelectReturn<T extends TMultiSelectItem> = ReturnType<
	typeof useMultiSelect<T>
>;
