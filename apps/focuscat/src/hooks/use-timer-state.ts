import React from 'react';
import { specta } from '@/environment';

export function useTimerState() {
	const [state, setState] = React.useState<specta.Timer | null>(null);

	React.useEffect(() => {
		let unlisten: (() => void) | undefined;

		(async () => {
			const timerState = await specta.commands.getTimer();
			setState(timerState);
			unlisten = await specta.events.timerUpdatedEvent.listen((event) => setState(event.payload));
		})();

		return () => unlisten?.();
	}, []);

	return state;
}
