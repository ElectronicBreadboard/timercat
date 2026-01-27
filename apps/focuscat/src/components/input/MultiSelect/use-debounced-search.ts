import React from 'react';

/**
 * Hook for debounced async search with stale response handling.
 *
 * Features:
 * - Debounces search requests to avoid excessive API calls
 * - Discards stale responses when newer searches are pending
 * - Tracks loading state
 * - Optionally filters results
 */
export function useDebouncedSearch<T>(options: TUseDebouncedSearchOptions<T>) {
	const { query, onSearch, debounceMs = 200, filter, enabled = true } = options;

	const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
	const searchIdRef = React.useRef(0);

	const [results, setResults] = React.useState<T[]>([]);
	const [isSearching, setIsSearching] = React.useState(false);

	React.useEffect(() => {
		if (debounceRef.current != null) {
			clearTimeout(debounceRef.current);
		}

		const trimmedQuery = query.trim();
		if (!trimmedQuery || !enabled) {
			setResults([]);
			setIsSearching(false);
			return;
		}

		setIsSearching(true);
		const searchId = ++searchIdRef.current;
		const isStaleResponse = () => searchId !== searchIdRef.current;

		debounceRef.current = setTimeout(async () => {
			const searchResults = await onSearch(trimmedQuery);
			if (isStaleResponse()) {
				return;
			}
			setResults(filter != null ? searchResults.filter(filter) : searchResults);
			setIsSearching(false);
		}, debounceMs);

		return () => {
			if (debounceRef.current != null) {
				clearTimeout(debounceRef.current);
			}
		};
	}, [query, onSearch, debounceMs, filter, enabled]);

	/** Clear results and reset state */
	const clear = React.useCallback(() => {
		setResults([]);
		setIsSearching(false);
	}, []);

	return { results, isSearching, clear };
}

// MARK: - Types

export interface TUseDebouncedSearchOptions<T> {
	/** Search query string */
	query: string;
	/** Async function to perform the search */
	onSearch: (query: string) => Promise<T[]>;
	/** Debounce delay in milliseconds (default: 200) */
	debounceMs?: number;
	/** Optional filter function applied to results */
	filter?: (item: T) => boolean;
	/** Whether search is enabled (default: true) */
	enabled?: boolean;
}
