import {
	useMemoCleanup,
	useTimerCx,
	type TCountdownCx,
	type TPomodoroCx,
	type TProgressivePomodoroCx,
	type TTimerViewConfig,
	type TTimerViewCx
} from '@repo/ui';
import { createState } from 'feature-state';
import { specta } from '@/environment';
import { TAppSettings, useSettingsCx, type SettingsCx } from '@/features/settings';

export class TimerViewCx implements TTimerViewCx {
	public readonly timer: TCountdownCx | TPomodoroCx | TProgressivePomodoroCx;
	public readonly $previewMinutes = createState<number | null>(null);
	public readonly $config = createState<TTimerViewConfig>({
		pomodoro: { sessionsBeforeLongBreak: 4, autoAdvance: false, autoAdvanceCountdownSeconds: 5 },
		progressive: { autoAdvance: false, autoAdvanceCountdownSeconds: 5 },
		dev: { showSpeed: false }
	});

	private _unlisten?: () => void;

	constructor(
		timerCx: TCountdownCx | TPomodoroCx | TProgressivePomodoroCx,
		settingsCx: SettingsCx
	) {
		this.timer = timerCx;

		const s = settingsCx.$appSettings.get();
		this.$config.set(this._buildConfig(s));

		this._unlisten = settingsCx.$appSettings.listen(({ value }) => {
			this.$config.set(this._buildConfig(value));
		});
	}

	public playSound(id: string): void {
		specta.commands.playSound(id as specta.SoundId);
	}

	public unmount(): void {
		this._unlisten?.();
	}

	private _buildConfig(s: TAppSettings): TTimerViewConfig {
		return {
			pomodoro: {
				sessionsBeforeLongBreak: s.timer.pomodoro.sessionsBeforeLongBreak,
				autoAdvance: s.timer.pomodoro.autoAdvance,
				autoAdvanceCountdownSeconds: s.timer.pomodoro.autoAdvanceCountdownSeconds
			},
			progressive: {
				autoAdvance: s.timer.progressive.autoAdvance,
				autoAdvanceCountdownSeconds: s.timer.progressive.autoAdvanceCountdownSeconds
			},
			dev: { showSpeed: s.features.developer }
		};
	}
}

export function useTimerViewCx(): TTimerViewCx {
	const timerCx = useTimerCx<TCountdownCx | TPomodoroCx | TProgressivePomodoroCx>();
	const settingsCx = useSettingsCx();

	return useMemoCleanup(() => {
		const viewCx = new TimerViewCx(timerCx, settingsCx);
		return [viewCx, () => viewCx.unmount()];
	}, [timerCx, settingsCx]);
}
