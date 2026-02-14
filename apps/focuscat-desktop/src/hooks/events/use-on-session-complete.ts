import React from 'react';
import { specta } from '@/environment';

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
