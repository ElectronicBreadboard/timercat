import React from 'react';
import { specta } from '@/environment';
import { toTuple } from '@/lib';
import { useAppInfo } from '../use-app-info';

export function useUpdateChecker(): TUpdateChecker {
	const appInfo = useAppInfo();

	const [updateInfo, setUpdateInfo] = React.useState<TUpdateInfoWithUrgency | null>(null);
	const [installing, setInstalling] = React.useState(false);

	const install = React.useCallback(async () => {
		if (updateInfo == null) {
			return;
		}

		setInstalling(true);
		const [ok, , err] = toTuple(await specta.commands.installUpdate());
		if (!ok) {
			console.error('Failed to install update:', err);
			setInstalling(false);
		}
	}, [updateInfo]);

	React.useEffect(() => {
		if (appInfo.stage !== 'prod' || appInfo.distribution !== 'direct') {
			return;
		}

		let unlisten: (() => void) | undefined;

		specta.events.updateAvailableEvent
			.listen((event) => {
				setUpdateInfo({ ...event.payload, urgency: computeUrgency(event.payload) });
			})
			.then((fn) => {
				unlisten = fn;
			});

		return () => unlisten?.();
	}, [appInfo]);

	return {
		updateAvailable: updateInfo != null,
		updateInfo,
		installing,
		install
	} as TUpdateChecker;
}

export type TUpdateChecker = {
	installing: boolean;
	install: () => Promise<void>;
} & (
	| { updateAvailable: true; updateInfo: TUpdateInfoWithUrgency }
	| { updateAvailable: false; updateInfo: null }
);

export type TUpdateInfoWithUrgency = specta.UpdateInfo & { urgency: TUpdateUrgency };

export type TUpdateUrgency = 'normal' | 'warning' | 'urgent';

/** Gray: 1–2 patch behind. Yellow: more patch or 1 minor. Red: major or many patch/minor. */
function computeUrgency(info: specta.UpdateInfo): TUpdateUrgency {
	if (info.majorBehind > 0) {
		return 'urgent';
	}
	if (info.minorBehind >= 2) {
		return 'urgent';
	}
	if (info.minorBehind > 0) {
		return 'warning';
	}
	if (info.patchBehind <= 2) {
		return 'normal';
	}
	if (info.patchBehind <= 5) {
		return 'warning';
	}
	return 'urgent';
}
