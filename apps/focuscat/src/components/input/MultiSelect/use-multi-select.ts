import React from 'react';

export function useMultiSelect<T extends TMultiSelectItem>(
	options: TUseMultiSelectOptions<T>
): TUseMultiSelectReturn<T> {
	const {
		value,
		onChange,
		onSearch,
		debounceMs = 200,
		filterSelected = true,
		viewportPadding = 16,
		minPopupHeight = 100
	} = options;

	// State
	const [isOpen, setIsOpen] = React.useState(false);
	const [query, setQuery] = React.useState('');
	const [results, setResults] = React.useState<T[]>([]);
	const [isSearching, setIsSearching] = React.useState(false);
	const [side, setSide] = React.useState<'top' | 'bottom'>('bottom');
	const [highlightedIndex, setHighlightedIndex] = React.useState(0);

	// Refs
	const containerRef = React.useRef<HTMLDivElement | null>(null);
	const inputRef = React.useRef<HTMLInputElement | null>(null);
	const popupRef = React.useRef<HTMLDivElement | null>(null);
	const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

	// Computed
	const showPopup = isOpen && (query.trim() !== '' || isSearching);
	const inputCollapsed = !isOpen && value.length > 0;
	const showEmpty = !isSearching && results.length === 0 && query.trim() !== '';

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

	// MARK: - Event Handlers

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
		setTimeout(() => setIsOpen(false), 150);
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
						select(results[highlightedIndex]!);
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

	// MARK: - Effects

	React.useEffect(() => {
		if (!isOpen) {
			setQuery('');
			setResults([]);
			setHighlightedIndex(0);
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

		if (query.trim() === '') {
			setResults([]);
			setIsSearching(false);
			return;
		}

		setIsSearching(true);
		debounceRef.current = setTimeout(() => {
			onSearch(query.trim())
				.then((searchResults) => {
					if (filterSelected) {
						const selectedIds = new Set(value.map((v) => v.id));
						setResults(searchResults.filter((r) => !selectedIds.has(r.id)));
					} else {
						setResults(searchResults);
					}
				})
				.catch(() => {
					setResults([]);
				})
				.finally(() => {
					setIsSearching(false);
				});
		}, debounceMs);

		return () => {
			if (debounceRef.current != null) {
				clearTimeout(debounceRef.current);
			}
		};
	}, [query, onSearch, debounceMs, filterSelected, value]);

	// Constrain popup height to available viewport space
	React.useLayoutEffect(() => {
		if (!showPopup) {
			setSide('bottom');
			return;
		}

		let frameId: number | null = null;
		let observer: MutationObserver | null = null;

		const updatePopup = () => {
			const popup = popupRef.current;
			const container = containerRef.current;
			if (popup == null || container == null) {
				return;
			}

			// Sync side state with base-ui's positioning decision
			const popupSide = popup.getAttribute('data-side') as 'top' | 'bottom' | null;
			if (popupSide != null) {
				setSide(popupSide);
			}

			// Use container bounds (popup anchor), not input (may wrap to second line)
			const containerRect = container.getBoundingClientRect();
			const availableHeight =
				popupSide === 'top'
					? containerRect.top - viewportPadding
					: window.innerHeight - containerRect.bottom - viewportPadding;

			popup.style.maxHeight = `${Math.max(minPopupHeight, availableHeight)}px`;
		};

		const waitForPopup = () => {
			if (popupRef.current == null) {
				frameId = requestAnimationFrame(waitForPopup);
				return;
			}

			updatePopup();

			// Watch for position flips (base-ui may flip when near viewport edge)
			observer = new MutationObserver(updatePopup);
			observer.observe(popupRef.current, { attributes: true, attributeFilter: ['data-side'] });
		};

		const handleScroll = (e: Event) => {
			// Ignore scrolls inside popup (user scrolling through results)
			if (popupRef.current?.contains(e.target as Node)) {
				return;
			}
			updatePopup();
		};

		waitForPopup();
		window.addEventListener('scroll', handleScroll, { capture: true, passive: true });

		return () => {
			if (frameId != null) {
				cancelAnimationFrame(frameId);
			}
			observer?.disconnect();
			window.removeEventListener('scroll', handleScroll, { capture: true });
			if (popupRef.current) {
				popupRef.current.style.maxHeight = '';
			}
		};
	}, [showPopup, viewportPadding, minPopupHeight]);

	// MARK: - Props Getters

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
			ref: inputRef,
			value: query,
			onChange: handleQueryChange,
			onFocus: handleInputFocus,
			onBlur: handleInputBlur,
			onKeyDown: handleInputKeyDown,
			'data-collapsed': (inputCollapsed ? true : undefined) as true | undefined
		}),
		[query, handleQueryChange, handleInputFocus, handleInputBlur, handleInputKeyDown, inputCollapsed]
	);

	const getPopupProps = React.useCallback(
		() => ({
			ref: popupRef,
			'data-popup': true as const
		}),
		[]
	);

	const getItemProps = React.useCallback(
		(index: number) => ({
			'data-highlighted': (index === highlightedIndex ? true : undefined) as true | undefined,
			onMouseEnter: () => setHighlightedIndex(index)
		}),
		[highlightedIndex]
	);

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
	};
}

// MARK: - Types

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

export interface TUseMultiSelectReturn<T extends TMultiSelectItem> {
	// State
	showPopup: boolean;
	query: string;
	results: T[];
	isSearching: boolean;
	showEmpty: boolean;

	// Actions
	select: (item: T) => void;
	remove: (id: string) => void;
	clear: () => void;
	close: () => void;

	// Props getters
	getRootProps: () => { open: boolean };
	getContainerProps: () => {
		ref: React.RefObject<HTMLDivElement | null>;
		open: boolean;
		onClick: () => void;
		side: 'top' | 'bottom' | undefined;
	};
	getInputProps: () => {
		ref: React.RefObject<HTMLInputElement | null>;
		value: string;
		onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
		onFocus: () => void;
		onBlur: (e: React.FocusEvent) => void;
		onKeyDown: (e: React.KeyboardEvent) => void;
		'data-collapsed': true | undefined;
	};
	getPopupProps: () => {
		ref: React.RefObject<HTMLDivElement | null>;
		'data-popup': true;
	};
	getItemProps: (index: number) => {
		'data-highlighted': true | undefined;
		onMouseEnter: () => void;
	};
}
