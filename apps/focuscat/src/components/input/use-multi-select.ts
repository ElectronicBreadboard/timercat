import React from 'react';

// MARK: - Hook

export function useMultiSelect<T extends TMultiSelectItem>(
	options: TUseMultiSelectOptions<T>
): TUseMultiSelectReturn<T> {
	const { value, onChange, onSearch, debounceMs = 200, filterSelected = true } = options;

	// State
	const [isOpen, setIsOpen] = React.useState(false);
	const [query, setQuery] = React.useState('');
	const [results, setResults] = React.useState<T[]>([]);
	const [isSearching, setIsSearching] = React.useState(false);
	const [side, setSide] = React.useState<'top' | 'bottom'>('bottom');

	// Refs
	const inputRef = React.useRef<HTMLInputElement | null>(null);
	const popupRef = React.useRef<HTMLDivElement | null>(null);
	const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

	// Computed
	const showPopup = isOpen && (query.trim() !== '' || isSearching);

	// MARK: - Actions

	const select = React.useCallback(
		(item: T) => {
			onChange([...value, item]);
			setQuery('');
			setResults([]);
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
		// Keep open if clicking inside popup
		if ((e.relatedTarget as HTMLElement | null)?.closest('[data-popup]')) {
			return;
		}
		setTimeout(() => setIsOpen(false), 150);
	}, []);

	const handleInputKeyDown = React.useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === 'Backspace' && query === '' && value.length > 0) {
				onChange(value.slice(0, -1));
			}
			if (e.key === 'Escape') {
				setIsOpen(false);
				inputRef.current?.blur();
			}
		},
		[query, value, onChange]
	);

	const handleQueryChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		setQuery(e.target.value);
	}, []);

	// MARK: - Effects

	// Clear state when closed
	React.useEffect(() => {
		if (!isOpen) {
			setQuery('');
			setResults([]);
		}
	}, [isOpen]);

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
			const searchResults = await onSearch(query.trim());

			if (filterSelected) {
				const selectedIds = new Set(value.map((v) => v.id));
				setResults(searchResults.filter((r) => !selectedIds.has(r.id)));
			} else {
				setResults(searchResults);
			}
			setIsSearching(false);
		}, debounceMs);

		return () => {
			if (debounceRef.current != null) {
				clearTimeout(debounceRef.current);
			}
		};
	}, [query, onSearch, debounceMs, filterSelected, value]);

	// Sync popup position to container
	React.useLayoutEffect(() => {
		if (!showPopup) {
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

			// Watch for position changes
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
	}, [showPopup]);

	// MARK: - Props Spreaders

	const getContainerProps = React.useCallback(
		() => ({
			onClick: handleContainerClick,
			side: showPopup ? side : undefined
		}),
		[handleContainerClick, showPopup, side]
	);

	const getInputProps = React.useCallback(
		() => ({
			ref: inputRef,
			type: 'text' as const,
			value: query,
			onChange: handleQueryChange,
			onFocus: handleInputFocus,
			onBlur: handleInputBlur,
			onKeyDown: handleInputKeyDown
		}),
		[query, handleQueryChange, handleInputFocus, handleInputBlur, handleInputKeyDown]
	);

	const getPopupProps = React.useCallback(
		() => ({
			ref: popupRef,
			'data-popup': true as const
		}),
		[]
	);

	return {
		// State
		isOpen,
		query,
		results,
		isSearching,
		side,

		// Refs
		inputRef,
		popupRef,

		// Actions
		select,
		remove,
		clear,
		setQuery,
		close,

		// Props spreaders
		getContainerProps,
		getInputProps,
		getPopupProps,

		// Computed
		showPopup
	};
}

// MARK: - Types

export interface TMultiSelectItem {
	id: string;
}

export interface TUseMultiSelectOptions<T extends TMultiSelectItem> {
	/** Currently selected items */
	value: T[];
	/** Callback when selection changes */
	onChange: (items: T[]) => void;
	/** Async search function */
	onSearch: (query: string) => Promise<T[]>;
	/** Debounce delay in ms */
	debounceMs?: number;
	/** Filter out already selected items from results */
	filterSelected?: boolean;
}

export interface TUseMultiSelectReturn<T extends TMultiSelectItem> {
	// State
	isOpen: boolean;
	query: string;
	results: T[];
	isSearching: boolean;
	side: 'top' | 'bottom';

	// Refs
	inputRef: React.RefObject<HTMLInputElement | null>;
	popupRef: React.RefObject<HTMLDivElement | null>;

	// Actions
	select: (item: T) => void;
	remove: (id: string) => void;
	clear: () => void;
	setQuery: (query: string) => void;
	close: () => void;

	// Props spreaders
	getContainerProps: () => {
		onClick: () => void;
		side: 'top' | 'bottom' | undefined;
	};
	getInputProps: () => {
		ref: React.RefObject<HTMLInputElement | null>;
		type: 'text';
		value: string;
		onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
		onFocus: () => void;
		onBlur: (e: React.FocusEvent) => void;
		onKeyDown: (e: React.KeyboardEvent) => void;
	};
	getPopupProps: () => {
		ref: React.RefObject<HTMLDivElement | null>;
		'data-popup': true;
	};

	// Computed
	showPopup: boolean;
}
