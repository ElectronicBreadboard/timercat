import { createState } from 'feature-state';
import React from 'react';
import { specta } from '@/environment';
import { useMemoCleanup } from '@/hooks';

// MARK: - Context

const SettingsCx = React.createContext<TSettingsCx | null>(null);

export const SettingsCxProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const cx = useMemoCleanup(() => {
		const settingsCx = createSettingsCx();
		settingsCx.mount();
		return [settingsCx, () => settingsCx.unmount()];
	}, []);

	return <SettingsCx.Provider value={cx}>{children}</SettingsCx.Provider>;
};

export function useSettingsCx(): TSettingsCx {
	const cx = React.useContext(SettingsCx);
	if (cx == null) {
		throw new Error('useSettingsCx must be used within a SettingsCxProvider');
	}
	return cx;
}

// MARK: - Factory

const defaultSettings: specta.AppSettings = {
	debug: false,
	workDurationMinutes: 25,
	shortBreakMinutes: 5,
	longBreakMinutes: 15,
	sessionsBeforeLongBreak: 4
};

function createSettingsCx(): TSettingsCx {
	const $appSettings = createState<specta.AppSettings>(defaultSettings);

	let unlisten: (() => void) | undefined;

	return {
		$appSettings,

		async mount() {
			$appSettings.set(await specta.commands.getSettings());

			unlisten = await specta.events.appSettingsChangedEvent.listen((event) => {
				$appSettings.set(event.payload);
			});
		},

		unmount() {
			unlisten?.();
		},

		async update(updates: Partial<specta.AppSettings>) {
			const current = $appSettings.get();
			const updated = { ...current, ...updates };
			$appSettings.set(updated);
			await specta.commands.setSettings(updated);
		}
	};
}

export interface TSettingsCx {
	$appSettings: ReturnType<typeof createState<specta.AppSettings>>;

	mount: () => Promise<void>;
	unmount: () => void;

	update: (updates: Partial<specta.AppSettings>) => Promise<void>;
}
