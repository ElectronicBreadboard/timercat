import { useFeatureState } from 'feature-react/state';
import { createState } from 'feature-state';
import React from 'react';

export class MultiSelectCx<GItem extends { id: string }> {
	private _value: GItem[] = [];
	private _onChange: (items: GItem[]) => void = () => {};
	private _onSearch: (query: string) => Promise<GItem[]> = async () => [];
	private _resolveItem?: (item: GItem) => GItem[] | null;
	private _debounceMs = 200;
	private _filterSelected = true;
	private _disabled = false;

	public readonly inputRef = React.createRef<HTMLInputElement>();
	public readonly popupRef = React.createRef<HTMLDivElement>();
	private _lastMousePos: { x: number; y: number } | null = null;

	private readonly _id: string;
	public readonly popupId: string;

	public readonly $isOpen = createState(false);
	public readonly $query = createState('');
	public readonly $highlightedIndex = createState(0);
	public readonly $side = createState<'top' | 'bottom'>('bottom');
	public readonly $searchResults = createState<GItem[]>([]);
	public readonly $isSearching = createState(false);
	public readonly $emptyResults = createState<GItem[]>([]);

	private _debounceTimer: ReturnType<typeof setTimeout> | null = null;
	private _searchId = 0;
	private _sideObserver: MutationObserver | null = null;
	private _sideRafId: number | null = null;
	private _unlisteners: (() => void)[] = [];

	constructor(id: string, options: TMultiSelectCxOptions<GItem>) {
		this._id = id;
		this.popupId = `multiselect-popup-${id}`;
		this.applyOptions(options);

		this._unlisteners.push(
			this.$isOpen.listen(() => {
				if (this.$isOpen.get()) {
					this.startSideObserver();
				} else {
					this.resetOnClose();
					this.stopSideObserver();
				}
			}),
			this.$searchResults.listen(() => {
				if (this.$highlightedIndex.get() !== 0) {
					this.$highlightedIndex.set(0);
				}
			}),
			this.$highlightedIndex.listen(() => {
				this.scrollHighlightedIntoView();
			})
		);
	}

	public applyOptions(options: TMultiSelectCxOptions<GItem>): void {
		this._value = options.value;
		this._onChange = options.onChange;
		this._onSearch = options.onSearch;
		this._resolveItem = options.resolveItem;
		this._debounceMs = options.debounceMs ?? 200;
		this._filterSelected = options.filterSelected ?? true;
		this._disabled = options.disabled ?? false;

		const newEmptyResults = options.emptyResults ?? [];
		if (newEmptyResults !== this.$emptyResults.get()) {
			this.$emptyResults.set(newEmptyResults);
		}
	}

	public unmount(): void {
		for (const unlisten of this._unlisteners) {
			unlisten();
		}
		this._unlisteners = [];
		this.cancelPendingSearch();
		this.stopSideObserver();
	}

	public get query(): string {
		return this.$query.get();
	}

	public get hasQuery(): boolean {
		return this.$query.get().trim() !== '';
	}

	private get results(): GItem[] {
		return this.hasQuery || this.$isSearching.get()
			? this.$searchResults.get()
			: this.$emptyResults.get();
	}

	private get showPopup(): boolean {
		return (
			this.$isOpen.get() &&
			(this.hasQuery || this.$isSearching.get() || this.$emptyResults.get().length > 0)
		);
	}

	// Actions

	public select = (item: GItem): void => {
		this._onChange([...this._value, item]);
		this.resetSearchState();
		this.inputRef.current?.focus();
	};

	public remove = (id: string): void => {
		this._onChange(this._value.filter((item) => item.id !== id));
		this.inputRef.current?.focus();
	};

	public toggle = (item: GItem): void => {
		const resolved = this._resolveItem?.(item);
		if (resolved != null) {
			const allSelected = resolved.every((r) => this._value.some((v) => v.id === r.id));
			if (allSelected) {
				const ids = new Set(resolved.map((r) => r.id));
				this._onChange(this._value.filter((v) => !ids.has(v.id)));
			} else {
				const existing = new Set(this._value.map((v) => v.id));
				const toAdd = resolved.filter((r) => !existing.has(r.id));
				this._onChange([...this._value, ...toAdd]);
			}
		} else {
			const exists = this._value.some((v) => v.id === item.id);
			if (exists) {
				this._onChange(this._value.filter((v) => v.id !== item.id));
			} else {
				this._onChange([...this._value, item]);
			}
		}
		this.resetSearchState();
		this.inputRef.current?.focus();
	};

	public clear = (): void => {
		this._onChange([]);
		this.inputRef.current?.focus();
	};

	public close = (): void => {
		this.$isOpen.set(false);
		this.inputRef.current?.blur();
	};

	// Props hooks

	private useShowPopup() {
		const isOpen = useFeatureState(this.$isOpen);
		const query = useFeatureState(this.$query);
		const isSearching = useFeatureState(this.$isSearching);
		const emptyResults = useFeatureState(this.$emptyResults);

		const hasQuery = query.trim() !== '';
		const showPopup = isOpen && (hasQuery || isSearching || emptyResults.length > 0);

		return { isOpen, query, hasQuery, showPopup, isSearching, emptyResults };
	}

	public useRootProps() {
		const { showPopup } = this.useShowPopup();

		return {
			open: showPopup,
			onOpenChange: this.handleOpenChange
		};
	}

	public useContainerProps() {
		const { showPopup } = this.useShowPopup();
		const side = useFeatureState(this.$side);

		return {
			open: showPopup,
			side: showPopup ? side : undefined,
			onClick: this.handleContainerClick
		};
	}

	public useInputProps() {
		const { isOpen, query, showPopup, hasQuery, isSearching, emptyResults } = this.useShowPopup();
		const highlightedIndex = useFeatureState(this.$highlightedIndex);
		const searchResults = useFeatureState(this.$searchResults);

		const results = hasQuery || isSearching ? searchResults : emptyResults;
		const inputCollapsed = !isOpen && this._value.length > 0;
		const highlightedItemId = results.length > 0 ? this.getAriaItemId(highlightedIndex) : undefined;

		return {
			'ref': this.inputRef,
			'value': query,
			'onChange': this.handleQueryChange,
			'onFocus': this.handleInputFocus,
			'onBlur': this.handleInputBlur,
			'onKeyDown': this.handleInputKeyDown,
			'data-collapsed': inputCollapsed || undefined,
			'disabled': this._disabled || undefined,
			'role': 'combobox' as const,
			'aria-expanded': showPopup,
			'aria-controls': showPopup ? this.popupId : undefined,
			'aria-activedescendant': showPopup ? highlightedItemId : undefined,
			'aria-autocomplete': 'list' as const
		};
	}

	public usePopupProps() {
		return {
			ref: this.popupRef,
			id: this.popupId,
			role: 'listbox' as const
		};
	}

	public useItemProps(index: number) {
		const highlightedIndex = useFeatureState(this.$highlightedIndex);
		const item = this.results[index];

		return {
			'id': this.getAriaItemId(index),
			'role': 'option' as const,
			'aria-selected': index === highlightedIndex,
			'data-highlighted': index === highlightedIndex || undefined,
			'selected': this.isSelected(item),
			// Only update highlight when cursor physically moves, not when DOM scrolls beneath it
			'onPointerMove': (e: React.PointerEvent) => {
				const lastPos = this._lastMousePos;
				const currentPos = { x: e.clientX, y: e.clientY };

				if (lastPos != null && lastPos.x === currentPos.x && lastPos.y === currentPos.y) {
					return;
				}

				this._lastMousePos = currentPos;

				if (highlightedIndex !== index) {
					this.$highlightedIndex.set(index);
				}
			}
		};
	}

	private isSelected(item: GItem | undefined): boolean {
		if (item == null) {
			return false;
		}
		const resolved = this._resolveItem?.(item);
		if (resolved != null) {
			return resolved.every((r) => this._value.some((v) => v.id === r.id));
		}
		return this._value.some((v) => v.id === item.id);
	}

	// Search

	private search(): void {
		this.cancelPendingSearch();

		const query = this.$query.get().trim();
		if (!query || !this.$isOpen.get() || this._disabled) {
			this.clearSearch();
			return;
		}

		// Avoid firing listener when already searching (e.g. subsequent keystrokes)
		if (!this.$isSearching.get()) {
			this.$isSearching.set(true);
		}

		const searchId = ++this._searchId;

		this._debounceTimer = setTimeout(async () => {
			const results = await this._onSearch(query);

			// Discard stale response
			if (searchId !== this._searchId) {
				return;
			}

			const filtered = this._filterSelected
				? results.filter((item) => !this._value.some((v) => v.id === item.id))
				: results;

			this.$searchResults.set(filtered);
			this.$isSearching.set(false);
		}, this._debounceMs);
	}

	private clearSearch(): void {
		this.cancelPendingSearch();
		if (this.$searchResults.get().length > 0) {
			this.$searchResults.set([]);
		}
		if (this.$isSearching.get()) {
			this.$isSearching.set(false);
		}
	}

	private cancelPendingSearch(): void {
		if (this._debounceTimer != null) {
			clearTimeout(this._debounceTimer);
			this._debounceTimer = null;
		}
	}

	private resetSearchState(): void {
		if (this.$query.get() !== '') {
			this.$query.set('');
		}
		this.clearSearch();
		if (this.$highlightedIndex.get() !== 0) {
			this.$highlightedIndex.set(0);
		}
	}

	private resetOnClose(): void {
		this.resetSearchState();
		this._lastMousePos = null;
	}

	// Side observer (tracks popup position for connected container visual)

	private startSideObserver(): void {
		this.stopSideObserver();

		const setup = (): void => {
			const popup = this.popupRef.current;
			if (popup == null) {
				this._sideRafId = requestAnimationFrame(setup);
				return;
			}

			const side = popup.getAttribute('data-side') as 'top' | 'bottom' | null;
			if (side != null) {
				this.$side.set(side);
			}

			this._sideObserver = new MutationObserver(() => {
				const newSide = popup.getAttribute('data-side') as 'top' | 'bottom' | null;
				if (newSide != null) {
					// Force repaint for flex-col-reverse rendering (WebView bug)
					popup.style.display = 'none';
					void popup.offsetHeight;
					popup.style.display = '';

					this.$side.set(newSide);
				}
			});
			this._sideObserver.observe(popup, { attributes: true, attributeFilter: ['data-side'] });
		};

		setup();
	}

	private stopSideObserver(): void {
		if (this._sideRafId != null) {
			cancelAnimationFrame(this._sideRafId);
			this._sideRafId = null;
		}
		this._sideObserver?.disconnect();
		this._sideObserver = null;
		this.$side.set('bottom');
	}

	private scrollHighlightedIntoView(): void {
		// Defer to next frame so React has time to update the DOM
		requestAnimationFrame(() => {
			if (!this.showPopup) {
				return;
			}
			const highlighted = this.popupRef.current?.querySelector('[data-highlighted]');
			highlighted?.scrollIntoView({ block: 'nearest' });
		});
	}

	// Event handlers

	private handleContainerClick = (): void => {
		this.inputRef.current?.focus();
	};

	private handleInputFocus = (): void => {
		if (!this._disabled) {
			this.$isOpen.set(true);
		}
	};

	private handleInputBlur = (e: React.FocusEvent): void => {
		// relatedTarget tells us where focus went - if it's inside popup, keep open
		const focusedInsidePopup = (e.relatedTarget as HTMLElement | null)?.closest('[data-popup]');
		if (focusedInsidePopup == null) {
			this.$isOpen.set(false);
		}
	};

	private handleOpenChange = (open: boolean): void => {
		this.$isOpen.set(open);
	};

	private handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
		this.$query.set(e.target.value);
		this.search();
	};

	private handleInputKeyDown = (e: React.KeyboardEvent): void => {
		const results = this.results;
		const highlightedIndex = this.$highlightedIndex.get();
		// ArrowDown should always move highlight visually downward on screen.
		// When popup is above input (side=top), CSS reverses list order,
		// so we invert the index direction to maintain visual consistency.
		const isReversed = this.$side.get() === 'top';

		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				if (results.length > 0) {
					this.$highlightedIndex.set(
						isReversed
							? Math.max(0, highlightedIndex - 1)
							: Math.min(results.length - 1, highlightedIndex + 1)
					);
				}
				break;
			case 'ArrowUp':
				e.preventDefault();
				if (results.length > 0) {
					this.$highlightedIndex.set(
						isReversed
							? Math.min(results.length - 1, highlightedIndex + 1)
							: Math.max(0, highlightedIndex - 1)
					);
				}
				break;
			case 'Enter': {
				e.preventDefault();
				const item = results[highlightedIndex];
				if (item != null) {
					this.toggle(item);
				}
				break;
			}
			case 'Escape':
				this.$isOpen.set(false);
				this.inputRef.current?.blur();
				break;
			case 'Backspace':
				if (this.$query.get() === '' && this._value.length > 0) {
					this._onChange(this._value.slice(0, -1));
				}
				break;
		}
	};

	private getAriaItemId(index: number): string {
		return `multiselect-item-${this._id}-${index}`;
	}
}

export interface TMultiSelectCxOptions<GItem extends { id: string }> {
	/** Currently selected items */
	value: GItem[];
	/** Called when selection changes */
	onChange: (items: GItem[]) => void;
	/** Async function to search for items (should be memoized with useCallback) */
	onSearch: (query: string) => Promise<GItem[]>;
	/** Resolve a compound item into its sub-items for toggle/selected. Return null for default. */
	resolveItem?: (item: GItem) => GItem[] | null;
	/** Debounce delay in milliseconds (default: 200) */
	debounceMs?: number;
	/** Whether to filter out already-selected items from results (default: true) */
	filterSelected?: boolean;
	/** Whether the input is disabled (default: false) */
	disabled?: boolean;
	/** Items to display when query is empty (default: []) */
	emptyResults?: GItem[];
}
