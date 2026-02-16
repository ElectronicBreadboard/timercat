import React from 'react';
import { specta } from '@/environment';
import { toTuple } from '@/lib';
import { useAppInfo } from '../use-app-info';

export function useUpdateChecker(): TUpdateChecker {
	const appInfo = useAppInfo();
	const [updateAvailable, setUpdateAvailable] = React.useState(false);
	const [installing, setInstalling] = React.useState(false);

	React.useEffect(() => {
		if (appInfo.stage !== 'prod' || appInfo.distribution !== 'direct') {
			return;
		}

		let unlisten: (() => void) | undefined;

		specta.events.updateAvailableEvent
			.listen(() => {
				setUpdateAvailable(true);
			})
			.then((fn) => {
				unlisten = fn;
			});

		return () => unlisten?.();
	}, [appInfo]);

	const install = React.useCallback(async () => {
		if (!updateAvailable) {
			return;
		}

		setInstalling(true);
		const [ok, , err] = toTuple(await specta.commands.installUpdate());
		if (!ok) {
			console.error('Failed to install update:', err);
			setInstalling(false);
		}
	}, [updateAvailable]);

	return { updateAvailable, installing, install };
}

export interface TUpdateChecker {
	updateAvailable: boolean;
	installing: boolean;
	install: () => Promise<void>;
}
