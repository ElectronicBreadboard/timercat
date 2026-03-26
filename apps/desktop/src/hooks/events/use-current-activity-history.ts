import React from 'react';
import { specta } from '@/environment';

export function useCurrentActivityHistory(
	options: TUseCurrentActivityHistoryOptions = {}
): specta.CurrentActivityDto[] {
	const { limit = 10 } = options;
	const [history, setHistory] = React.useState<specta.CurrentActivityDto[]>([]);

	React.useEffect(() => {
		const unlistenPromise = specta.events.currentActivityEvent.listen((event) => {
			setHistory((prev) => [event.payload, ...prev].slice(0, limit));
		});
		return () => {
			unlistenPromise.then((unlisten) => unlisten());
		};
	}, [limit]);

	return history;
}

export interface TUseCurrentActivityHistoryOptions {
	/** Max number of events to keep (newest first). Default 10. */
	limit?: number;
}
