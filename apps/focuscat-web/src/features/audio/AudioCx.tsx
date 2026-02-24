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

	public playSound(id: TSoundId): void {
		const { enabled, volume } = this._settingsCx.$appSettings.get().audio;
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

	public dispose(): void {
		this._audio?.ctx.close().catch(() => {});
		this._audio = null;
		this._buffers.clear();
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
}

// MARK: - React Context

const ReactAudioCx = React.createContext<AudioCx | null>(null);

export const AudioCxProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const settingsCx = useSettingsCx();

	const cx = useMemoCleanup(() => {
		const audioCx = new AudioCx(settingsCx);
		return [audioCx, () => audioCx.dispose()];
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
