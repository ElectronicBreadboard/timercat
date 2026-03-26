import { useMemoCleanup, type TTimerViewConfig, type TTimerViewCx } from '@repo/ui';
import { createState } from 'feature-state';
import { useAudioCx, type AudioCx, type TSoundId } from '@/features/audio';
import { useSettingsCx, type SettingsCx } from '@/features/settings';
import { CountdownTimerCx, PomodoroTimerCx } from './modes';
import { useTimerCx } from './use-timer-cx';

export class TimerViewCx implements TTimerViewCx {
	public readonly timer: CountdownTimerCx | PomodoroTimerCx;
	public readonly $previewMinutes = createState<number | null>(null);
	public readonly $config = createState<TTimerViewConfig>({
		pomodoro: { sessionsBeforeLongBreak: 4, autoAdvance: false, autoAdvanceCountdownSeconds: 5 },
		progressive: { autoAdvance: false, autoAdvanceCountdownSeconds: 5 },
		dev: { speed: 1 }
	});

	private readonly _audioCx: AudioCx;
	private _unlisten?: () => void;

	constructor(
		timerCx: CountdownTimerCx | PomodoroTimerCx,
		settingsCx: SettingsCx,
		audioCx: AudioCx
	) {
		this.timer = timerCx;
		this._audioCx = audioCx;

		const s = settingsCx.$appSettings.get();
		this.$config.set({
			pomodoro: {
				sessionsBeforeLongBreak: s.timer.pomodoro.sessionsBeforeLongBreak,
				autoAdvance: s.timer.pomodoro.autoAdvance,
				autoAdvanceCountdownSeconds: s.timer.pomodoro.autoAdvanceCountdownSeconds
			},
			progressive: { autoAdvance: false, autoAdvanceCountdownSeconds: 5 },
			dev: { speed: s.developer.timerSpeed }
		});

		this._unlisten = settingsCx.$appSettings.listen(({ value }) => {
			this.$config.set({
				pomodoro: {
					sessionsBeforeLongBreak: value.timer.pomodoro.sessionsBeforeLongBreak,
					autoAdvance: value.timer.pomodoro.autoAdvance,
					autoAdvanceCountdownSeconds: value.timer.pomodoro.autoAdvanceCountdownSeconds
				},
				progressive: { autoAdvance: false, autoAdvanceCountdownSeconds: 5 },
				dev: { speed: value.developer.timerSpeed }
			});
		});
	}

	public playSound(id: string): void {
		this._audioCx.playSound(id as TSoundId);
	}

	public unmount(): void {
		this._unlisten?.();
	}
}

export function useTimerViewCx(): TTimerViewCx {
	const timerCx = useTimerCx();
	const settingsCx = useSettingsCx();
	const audioCx = useAudioCx();

	return useMemoCleanup(() => {
		const viewCx = new TimerViewCx(timerCx, settingsCx, audioCx);
		return [viewCx, () => viewCx.unmount()];
	}, [timerCx, settingsCx, audioCx]);
}
