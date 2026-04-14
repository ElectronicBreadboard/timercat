import { useMemoCleanup } from '@repo/ui';
import { createState } from 'feature-state';
import React from 'react';
import { TVersionedMigrationConfig, withVersionedLocalStorage } from '@/lib';
import { type TAppSettings } from './types';

export class SettingsCx {
	public readonly $appSettings = withVersionedLocalStorage(
		createState<TAppSettings>({
			version: '0.0.4',
			features: {
				goals: true,
				catWindow: true,
				developer: false
			},
			appearance: {
				theme: 'auto',
				background: 'lofi'
			},
			audio: {
				session: { enabled: true, volume: 0.6 },
				sessionEnd: { enabled: true, volume: 0.6 },
				effects: { enabled: true, volume: 0.6 }
			},
			developer: {
				cat: false,
				timerSpeed: 1
			},
			timer: {
				timerMode: 'pomodoro',
				pomodoro: {
					workDurationMinutes: 25,
					shortBreakMinutes: 5,
					longBreakMinutes: 15,
					sessionsBeforeLongBreak: 4,
					autoAdvance: false,
					autoAdvanceCountdownSeconds: 5
				},
				countdown: {
					durationMinutes: 25
				},
				showSessionSetup: false
			},
			goals: {
				dailyGoalMinutes: 120
			},
			cat: {
				equippedFur: 'white',
				equippedFace: 'cute',
				equippedHat: null
			}
		}),
		'focuscat-app-settings',
		settingsMigrationConfig
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

const settingsMigrationConfig: TVersionedMigrationConfig<TAppSettings> = {
	latestVersion: '0.0.4',
	migrations: {
		'0.0.1': {
			to: '0.0.2',
			migrate: (value) => {
				const v = value as TAppSettings;
				return {
					...v,
					timer: {
						...(v.timer ?? {}),
						showSessionSetup: false
					}
				};
			}
		},
		'0.0.2': {
			to: '0.0.3',
			migrate: (value) => {
				const v = value as TAppSettings & { audio: { enabled?: boolean; volume?: number } };
				return {
					...v,
					audio: {
						session: { enabled: v.audio.enabled ?? true, volume: v.audio.volume ?? 0.6 },
						sessionEnd: { enabled: v.audio.enabled ?? true, volume: v.audio.volume ?? 0.6 },
						effects: { enabled: v.audio.enabled ?? true, volume: v.audio.volume ?? 0.6 }
					}
				};
			}
		},
		'0.0.3': {
			to: '0.0.4',
			migrate: (value) => {
				const v = value as TAppSettings;
				return {
					...v,
					appearance: {
						...v.appearance,
						background: 'lofi'
					}
				};
			}
		}
	}
};

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
