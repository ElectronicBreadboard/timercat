import React from 'react';
import { specta } from '@/environment';

export function useOnInputDetected(callback: (inputType: specta.InputType) => void): void {
	React.useEffect(() => {
		let unlisten: (() => void) | undefined;

		specta.events.inputDetectedEvent
			.listen((event) => {
				callback(event.payload);
			})
			.then((fn) => {
				unlisten = fn;
			});

		return () => unlisten?.();
	}, [callback]);
}
