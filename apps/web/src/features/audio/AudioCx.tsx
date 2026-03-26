import { useMemoCleanup } from '@repo/ui';
import React from 'react';
import { useSettingsCx, type SettingsCx } from '@/features/settings';
import { audioConfig, TSoundId } from './audio.config';

export class AudioCx {
	private readonly _settingsCx: SettingsCx;
	private _audio: { ctx: AudioContext; gainNode: GainNode } | null = null;
	private _buffers: Map<TSoundId, AudioBuffer> = new Map();

	constructor(settingsCx: SettingsCx) {
		this._settingsCx = settingsCx;
		this._preload();
	}

	public unmount(): void {
		this._audio?.ctx.close().catch(() => {});
		this._audio = null;
		this._buffers.clear();
	}

	public playSound(id: TSoundId): void {
		const channel = this._getSoundChannel(id);
		const { enabled, volume } = this._settingsCx.$appSettings.get().audio[channel];
		if (!enabled) {
			return;
		}

		const { ctx, gainNode } = this._getAudio();
		const buffer = this._buffers.get(id);
		if (buffer == null) {
			return;
		}

		if (ctx.state === 'suspended') {
			ctx.resume().catch(() => {});
		}

		gainNode.gain.setValueAtTime(volume, ctx.currentTime);

		const source = ctx.createBufferSource();
		source.buffer = buffer;
		source.connect(gainNode);
		source.start(0);
	}

	private _getAudio(): { ctx: AudioContext; gainNode: GainNode } {
		if (this._audio == null) {
			const ctx = new AudioContext();
			const gainNode = ctx.createGain();
			gainNode.connect(ctx.destination);
			this._audio = { ctx, gainNode };
		}
		return this._audio;
	}

	private _preload(): void {
		for (const id of Object.keys(audioConfig.filenameMap) as TSoundId[]) {
			fetch(audioConfig.resolvePath(id))
				.then((r) => r.arrayBuffer())
				.then((buf) => this._getAudio().ctx.decodeAudioData(buf))
				.then((decoded) => this._buffers.set(id, decoded))
				.catch(() => {});
		}
	}

	private _getSoundChannel(id: TSoundId): TSoundChannel {
		switch (id) {
			case 'tick':
			case 'wind-up-tick-1':
			case 'wind-up-tick-2':
			case 'wind-up-tick-3':
			case 'wind-up-tick-4':
			case 'wind-up-tick-5':
			case 'wind-up-tick-6':
			case 'wind-up-tick-7':
			case 'wind-up-tick-8':
			case 'wind-up-tick-9':
			case 'wind-up-tick-10':
			case 'wind-up-tick-11':
				return 'session';
			case 'complete':
				return 'sessionEnd';
			case 'meow':
				return 'effects';
		}
	}
}

type TSoundChannel = 'session' | 'sessionEnd' | 'effects';

// MARK: - React Context

const ReactAudioCx = React.createContext<AudioCx | null>(null);

export const AudioCxProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const settingsCx = useSettingsCx();

	const cx = useMemoCleanup(() => {
		const audioCx = new AudioCx(settingsCx);
		return [audioCx, () => audioCx.unmount()];
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
