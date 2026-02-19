import { useMemoCleanup } from '@repo/ui';
import { withLocalStorage } from 'feature-react';
import { createState } from 'feature-state';
import React from 'react';
import { type TAppSettings } from './types';

export class SettingsCx {
	public readonly $appSettings = withLocalStorage(
		createState<TAppSettings>({
			audio: {
				enabled: true,
				volume: 0.6
			},
			timer: {
				pomodoro: {
					workDurationMinutes: 25,
					shortBreakMinutes: 5,
					longBreakMinutes: 15,
					sessionsBeforeLongBreak: 4,
					autoAdvance: false,
					autoAdvanceCountdownSeconds: 5
				}
			},
			cat: {
				equippedFur: 'white',
				equippedFace: 'cute',
				equippedHat: null
			}
		}),
		'focuscat-settings'
	);

	public mount(): void {
		void this.$appSettings.persist();
	}

	public unmount(): void {
		// No listeners to clean up in web version
	}

	public update(updates: Partial<TAppSettings>): void {
		const current = this.$appSettings.get();
		const updated = { ...current, ...updates };
		this.$appSettings.set(updated);
	}
}

// MARK: - React Context

const ReactSettingsCx = React.createContext<SettingsCx | null>(null);

export const SettingsCxProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const cx = useMemoCleanup(() => {
		const settingsCx = new SettingsCx();
		return [settingsCx, () => settingsCx.unmount()];
	}, []);

	React.useEffect(() => {
		cx.mount();
	}, [cx]);

	return <ReactSettingsCx.Provider value={cx}>{children}</ReactSettingsCx.Provider>;
};

export function useSettingsCx(): SettingsCx {
	const cx = React.useContext(ReactSettingsCx);
	if (cx == null) {
		throw new Error('useSettingsCx must be used within a SettingsCxProvider');
	}
	return cx;
}
