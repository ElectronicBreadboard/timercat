import React from 'react';
import { specta } from '@/environment';
import type { TCatRef } from '@/features/cat';

export function useInputTap(catRef: React.RefObject<TCatRef | null>) {
	React.useEffect(() => {
		let unlisten: (() => void) | undefined;

		(async () => {
			unlisten = await specta.events.inputDetectedEvent.listen(() => {
				catRef.current?.tap();
			});
		})();

		return () => unlisten?.();
	}, [catRef]);
}
