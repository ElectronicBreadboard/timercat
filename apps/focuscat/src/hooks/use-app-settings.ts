import React from 'react';
import { specta } from '@/environment';

export function useAppSettings(): TUseAppSettingsReturn {
	const [settings, setSettings] = React.useState<specta.AppSettings>({
		debug: false,
		workDurationMinutes: 25,
		shortBreakMinutes: 5,
		longBreakMinutes: 15,
		sessionsBeforeLongBreak: 4
	});

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

	const updateSettings = React.useCallback(async (updates: Partial<specta.AppSettings>) => {
		const updated = { ...settings, ...updates };
		setSettings(updated);
		await specta.commands.setSettings(updated);
	}, [settings]);

	return { settings, updateSettings };
}

interface TUseAppSettingsReturn {
	settings: specta.AppSettings;
	updateSettings: (updates: Partial<specta.AppSettings>) => Promise<void>;
}
