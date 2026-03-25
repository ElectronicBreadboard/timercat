import { ChevronRightIcon, cn, Slider, Switch } from '@repo/ui';
import React from 'react';
import { specta } from '@/environment';
import { SettingGroup } from './SettingGroup';
import { SettingItem } from './SettingItem';

export const AudioSettingGroup: React.FC<TAudioSettingGroupProps> = (props) => {
	const { audio, onUpdate } = props;

	const [showAdvanced, setShowAdvanced] = React.useState(false);

	const channels = [audio.session, audio.sessionEnd, audio.effects];
	const enabledChannels = channels.filter((c) => c.enabled);
	const isAnyEnabled = enabledChannels.length > 0;
	const hasCustomMix = channels.some(
		(c) => c.enabled !== audio.session.enabled || c.volume !== audio.session.volume
	);
	const masterVolume =
		enabledChannels.length === 0
			? 0
			: snapVolumePercentToStep(
					(enabledChannels.reduce((sum, c) => sum + c.volume, 0) / enabledChannels.length) * 100
				);

	// MARK: - Actions

	const updateChannel = React.useCallback(
		(channel: keyof specta.AudioSettings, updates: Partial<specta.AudioChannelSettings>) => {
			onUpdate({ ...audio, [channel]: { ...audio[channel], ...updates } });
		},
		[audio, onUpdate]
	);

	const updateAllChannels = React.useCallback(
		(updates: Partial<specta.AudioChannelSettings>) => {
			onUpdate({
				...audio,
				session: { ...audio.session, ...updates },
				sessionEnd: { ...audio.sessionEnd, ...updates },
				effects: { ...audio.effects, ...updates }
			});
		},
		[audio, onUpdate]
	);

	const updateMasterVolume = React.useCallback(
		(nextVolumePercent: number) => {
			const nextVolume = snapVolumePercentToStep(nextVolumePercent) / 100;
			const channels = [audio.session, audio.sessionEnd, audio.effects];
			const activeChannels = channels.filter((c) => c.enabled);

			if (activeChannels.length === 0) return;

			const currentMasterVolume =
				snapVolumePercentToStep(
					(activeChannels.reduce((sum, c) => sum + c.volume, 0) / activeChannels.length) * 100
				) / 100;

			if (currentMasterVolume <= 0) {
				onUpdate({
					...audio,
					session: audio.session.enabled ? { ...audio.session, volume: nextVolume } : audio.session,
					sessionEnd: audio.sessionEnd.enabled
						? { ...audio.sessionEnd, volume: nextVolume }
						: audio.sessionEnd,
					effects: audio.effects.enabled ? { ...audio.effects, volume: nextVolume } : audio.effects
				});
				return;
			}

			const scale = nextVolume / currentMasterVolume;
			const scaleChannel = (c: specta.AudioChannelSettings) =>
				c.enabled
					? {
							...c,
							volume:
								snapVolumePercentToStep(Math.min(100, Math.max(0, c.volume * scale * 100))) / 100
						}
					: c;

			onUpdate({
				...audio,
				session: scaleChannel(audio.session),
				sessionEnd: scaleChannel(audio.sessionEnd),
				effects: scaleChannel(audio.effects)
			});
		},
		[audio, onUpdate]
	);

	// MARK: - UI

	return (
		<SettingGroup title="Audio">
			<SettingItem
				label="All sounds"
				description={hasCustomMix ? 'Your custom mix is preserved' : 'Toggle all app sounds'}
			>
				<Switch
					checked={isAnyEnabled}
					onCheckedChange={(checked) => {
						if (!checked) setShowAdvanced(false);
						updateAllChannels({ enabled: checked });
					}}
					size="sm"
				/>
			</SettingItem>
			{isAnyEnabled && (
				<SettingItem label="Master volume">
					<AudioVolumeControl
						value={masterVolume}
						ariaLabel="Master audio volume"
						onValueChange={updateMasterVolume}
					/>
				</SettingItem>
			)}
			{isAnyEnabled && (
				<>
					<SettingItem
						variant="action"
						label="Individual sound controls"
						description={hasCustomMix ? 'Sounds use different levels' : 'Adjust per sound'}
						onClick={() => setShowAdvanced((v) => !v)}
						className="py-2.5"
					>
						<ChevronRightIcon
							className={cn(
								'text-base-400 size-4 transition-transform duration-150',
								showAdvanced && 'rotate-90'
							)}
						/>
					</SettingItem>
					{showAdvanced && (
						<>
							<SettingItem
								label="Session sound"
								description="Ticking during sessions"
								className="bg-base-50/60 pl-8"
							>
								<Switch
									checked={audio.session.enabled}
									onCheckedChange={(checked) => updateChannel('session', { enabled: checked })}
									size="sm"
								/>
							</SettingItem>
							{audio.session.enabled && (
								<SettingItem label="Session volume" className="bg-base-50/60 pl-8">
									<AudioVolumeControl
										value={Math.round(audio.session.volume * 100)}
										ariaLabel="Session sound volume"
										onValueChange={(v) => updateChannel('session', { volume: v / 100 })}
									/>
								</SettingItem>
							)}
							<SettingItem
								label="Session end sound"
								description="Chime when a session ends"
								className="bg-base-50/60 pl-8"
							>
								<Switch
									checked={audio.sessionEnd.enabled}
									onCheckedChange={(checked) => updateChannel('sessionEnd', { enabled: checked })}
									size="sm"
								/>
							</SettingItem>
							{audio.sessionEnd.enabled && (
								<SettingItem label="Session end volume" className="bg-base-50/60 pl-8">
									<AudioVolumeControl
										value={Math.round(audio.sessionEnd.volume * 100)}
										ariaLabel="Session end sound volume"
										onValueChange={(v) => updateChannel('sessionEnd', { volume: v / 100 })}
									/>
								</SettingItem>
							)}
							<SettingItem
								label="Sound effects"
								description="Widget interaction sounds"
								className="bg-base-50/60 pl-8"
							>
								<Switch
									checked={audio.effects.enabled}
									onCheckedChange={(checked) => updateChannel('effects', { enabled: checked })}
									size="sm"
								/>
							</SettingItem>
							{audio.effects.enabled && (
								<SettingItem label="Effects volume" className="bg-base-50/60 pl-8">
									<AudioVolumeControl
										value={Math.round(audio.effects.volume * 100)}
										ariaLabel="Sound effects volume"
										onValueChange={(v) => updateChannel('effects', { volume: v / 100 })}
									/>
								</SettingItem>
							)}
						</>
					)}
				</>
			)}
		</SettingGroup>
	);
};

interface TAudioSettingGroupProps {
	audio: specta.AudioSettings;
	onUpdate: (audio: specta.AudioSettings) => void;
}

const AudioVolumeControl: React.FC<TAudioVolumeControlProps> = (props) => {
	const { value, ariaLabel, onValueChange } = props;
	return (
		<div className="flex min-w-40 items-center gap-3">
			<span className="text-base-500 shrink-0 text-right text-xs tabular-nums">{value}%</span>
			<div className="min-w-0 flex-1">
				<Slider
					value={value}
					min={0}
					max={100}
					step={AUDIO_VOLUME_STEP}
					size="sm"
					aria-label={ariaLabel}
					onValueChange={onValueChange}
				/>
			</div>
		</div>
	);
};

interface TAudioVolumeControlProps {
	value: number;
	ariaLabel: string;
	onValueChange: (value: number) => void;
}

const AUDIO_VOLUME_STEP = 5;

function snapVolumePercentToStep(value: number): number {
	return Math.min(100, Math.max(0, Math.round(value / AUDIO_VOLUME_STEP) * AUDIO_VOLUME_STEP));
}
