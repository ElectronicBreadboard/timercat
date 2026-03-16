import {
	useMemoCleanup,
	useTimerCx,
	type TCountdownCx,
	type TPomodoroCx,
	type TTimerViewConfig,
	type TTimerViewCx
} from '@repo/ui';
import { createState } from 'feature-state';
import { specta } from '@/environment';
import { useSettingsCx, type SettingsCx } from '@/features/settings';

export class TimerViewCx implements TTimerViewCx {
	public readonly timer: TCountdownCx | TPomodoroCx;
	public readonly $previewMinutes = createState<number | null>(null);
	public readonly $config = createState<TTimerViewConfig>({
		pomodoro: { sessionsBeforeLongBreak: 4, autoAdvance: false, autoAdvanceCountdownSeconds: 5 },
		dev: { showSpeed: false }
	});

	private _unlisten?: () => void;

	constructor(timerCx: TCountdownCx | TPomodoroCx, settingsCx: SettingsCx) {
		this.timer = timerCx;

		const s = settingsCx.$appSettings.get();
		this.$config.set({
			pomodoro: {
				sessionsBeforeLongBreak: s.timer.pomodoro.sessionsBeforeLongBreak,
				autoAdvance: s.timer.pomodoro.autoAdvance,
				autoAdvanceCountdownSeconds: s.timer.pomodoro.autoAdvanceCountdownSeconds
			},
			dev: { showSpeed: s.features.developer }
		});

		this._unlisten = settingsCx.$appSettings.listen(({ value }) => {
			this.$config.set({
				pomodoro: {
					sessionsBeforeLongBreak: value.timer.pomodoro.sessionsBeforeLongBreak,
					autoAdvance: value.timer.pomodoro.autoAdvance,
					autoAdvanceCountdownSeconds: value.timer.pomodoro.autoAdvanceCountdownSeconds
				},
				dev: { showSpeed: value.features.developer }
			});
		});
	}

	public playSound(id: string): void {
		specta.commands.playSound(id as specta.SoundId);
	}

	public unmount(): void {
		this._unlisten?.();
	}
}

export function useTimerViewCx(): TTimerViewCx {
	const timerCx = useTimerCx<TCountdownCx | TPomodoroCx>();
	const settingsCx = useSettingsCx();

	return useMemoCleanup(() => {
		const viewCx = new TimerViewCx(timerCx, settingsCx);
		return [viewCx, () => viewCx.unmount()];
	}, [timerCx, settingsCx]);
}
