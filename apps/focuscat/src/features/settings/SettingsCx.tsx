import { createState } from 'feature-state';
import React from 'react';
import { specta } from '@/environment';
import { useMemoCleanup } from '@/hooks';

export class SettingsCx {
	private _unlisten?: () => void;

	public readonly $appSettings = createState<specta.AppSettings>({
		appearance: {
			theme: 'auto'
		},
		debug: {
			enabled: false,
			cat: false,
			timerSpeed: 1
		},
		timer: {
			workDurationMinutes: 25,
			shortBreakMinutes: 5,
			longBreakMinutes: 15,
			sessionsBeforeLongBreak: 4
		},
		focusGoal: {
			dailyGoalMinutes: 120
		},
		activity: {
			enabled: true,
			trackWindows: true,
			trackBrowser: true
		}
	});

	constructor() {
		this.init();
	}

	private async init(): Promise<void> {
		this.$appSettings.set(await specta.commands.getSettings());
		this._unlisten = await specta.events.appSettingsChangedEvent.listen((event) => {
			this.$appSettings.set(event.payload);
		});
	}

	public unmount(): void {
		this._unlisten?.();
	}

	public async update(updates: Partial<specta.AppSettings>): Promise<void> {
		const current = this.$appSettings.get();
		const updated = { ...current, ...updates };
		this.$appSettings.set(updated);
		await specta.commands.setSettings(updated);
	}
}

const ReactSettingsCx = React.createContext<SettingsCx | null>(null);

export const SettingsCxProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const cx = useMemoCleanup(() => {
		const settingsCx = new SettingsCx();
		return [settingsCx, () => settingsCx.unmount()];
	}, []);

	return <ReactSettingsCx.Provider value={cx}>{children}</ReactSettingsCx.Provider>;
};

export function useSettingsCx(): SettingsCx {
	const cx = React.useContext(ReactSettingsCx);
	if (cx == null) {
		throw new Error('useSettingsCx must be used within a SettingsCxProvider');
	}
	return cx;
}
