import { useMemoCleanup } from '@repo/ui';
import React from 'react';
import { useSettingsCx, type SettingsCx } from '@/features/settings';
import { audioConfig, TSoundId } from './audio.config';

export class AudioCx {
	private readonly _settingsCx: SettingsCx;

	constructor(settingsCx: SettingsCx) {
		this._settingsCx = settingsCx;
	}

	public playSound(id: TSoundId): void {
		const { enabled, volume } = this._settingsCx.$appSettings.get().audio;
		if (!enabled) {
			return;
		}
		const audio = new Audio(audioConfig.resolvePath(id));
		audio.volume = volume;
		audio.play().catch(() => {
			// Ignore audio errors (e.g. file not found, autoplay blocked)
		});
	}
}

// MARK: - React Context

const ReactAudioCx = React.createContext<AudioCx | null>(null);

export const AudioCxProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const settingsCx = useSettingsCx();

	const cx = useMemoCleanup(() => {
		const audioCx = new AudioCx(settingsCx);
		return [audioCx, () => {}];
	}, [settingsCx]);

	return <ReactAudioCx.Provider value={cx}>{children}</ReactAudioCx.Provider>;
};

export function useAudioCx(): AudioCx {
	const cx = React.useContext(ReactAudioCx);
	if (cx == null) {
		throw new Error('useAudioCx must be used within an AudioCxProvider');
	}
	return cx;
}
