import React from 'react';
import { specta } from '@/environment';

export function useAppSettings() {
	const [settings, setSettings] = React.useState<specta.AppSettings>({ debug: false });

	React.useEffect(() => {
		let unlisten: (() => void) | undefined;

		(async () => {
			const settings = await specta.commands.getSettings();
			setSettings(settings);
			unlisten = await specta.events.appSettingsChangedEvent.listen((event) =>
				setSettings(event.payload)
			);
		})();

		return () => unlisten?.();
	}, []);

	return [settings, setSettings] as const;
}
