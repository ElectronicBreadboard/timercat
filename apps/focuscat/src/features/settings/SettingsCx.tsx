import { createState } from 'feature-state';
import React from 'react';
import { specta } from '@/environment';
import { type TCatFace, type TCatFur, type TCatHat } from '@/features/cat';
import { useMemoCleanup } from '@/hooks';

export class SettingsCx {
	private _unlisten?: () => void;

	public readonly $appSettings = createState<TAppSettings>({
		features: {
			goals: true,
			activity: true,
			profiles: true,
			catWindow: true,
			debug: false
		},
		appearance: {
			theme: 'auto'
		},
		debug: {
			cat: false,
			timerSpeed: 1
		},
		timer: {
			workDurationMinutes: 25,
			shortBreakMinutes: 5,
			longBreakMinutes: 15,
			sessionsBeforeLongBreak: 4,
			showSessionSetup: true
		},
		goals: {
			dailyGoalMinutes: 120
		},
		activity: {
			trackWindows: true,
			trackBrowser: true
		},
		cat: {
			equippedFur: 'white',
			equippedFace: 'cute',
			equippedHat: null
		}
	});

	constructor() {
		this.init();
	}

	private async init(): Promise<void> {
		this.$appSettings.set((await specta.commands.getSettings()) as TAppSettings);
		this._unlisten = await specta.events.appSettingsChangedEvent.listen((event) => {
			this.$appSettings.set(event.payload as TAppSettings);
		});
	}

	public unmount(): void {
		this._unlisten?.();
	}

	public async update(updates: Partial<TAppSettings>): Promise<void> {
		const current = this.$appSettings.get();
		const updated = { ...current, ...updates };
		this.$appSettings.set(updated);
		await specta.commands.setSettings(updated);
	}
}

export type TAppSettings = Omit<specta.AppSettings, 'cat'> & { cat: TCatSettings };

export interface TCatSettings {
	equippedFur: TCatFur;
	equippedFace: TCatFace;
	equippedHat: TCatHat | null;
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
