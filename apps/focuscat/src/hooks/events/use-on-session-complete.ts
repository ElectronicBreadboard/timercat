import React from 'react';
import { specta } from '@/environment';

/**
 * Hook to run a callback when a session completes.
 * Listens to the sessionCompletedEvent from the backend.
 */
export function useOnSessionComplete(callback: (session: specta.SessionSummaryDto) => void): void {
	React.useEffect(() => {
		let unlisten: (() => void) | undefined;

		specta.events.sessionCompletedEvent
			.listen((event) => {
				callback(event.payload);
			})
			.then((fn) => {
				unlisten = fn;
			});

		return () => unlisten?.();
	}, [callback]);
}
