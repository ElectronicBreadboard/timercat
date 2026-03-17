import { TimerCxProvider as BaseTimerCxProvider, useMemoCleanup } from '@repo/ui';
import { useFeatureState } from 'feature-react/state';
import React from 'react';
import { useAudioCx } from '@/features/audio';
import { useSessionCx } from '@/features/session';
import { useSettingsCx } from '@/features/settings';
import { CountdownTimerCx, PomodoroTimerCx } from './modes';

export const TimerCxProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const settingsCx = useSettingsCx();
	const sessionCx = useSessionCx();
	const audioCx = useAudioCx();
	const timerMode = useFeatureState(settingsCx.$appSettings).timer.timerMode;

	const cx = useMemoCleanup(() => {
		const timerCx =
			timerMode === 'countdown'
				? new CountdownTimerCx(settingsCx, sessionCx, audioCx)
				: new PomodoroTimerCx(settingsCx, sessionCx, audioCx);
		return [timerCx, () => timerCx.unmount()];
	}, [timerMode]);

	return <BaseTimerCxProvider value={cx}>{children}</BaseTimerCxProvider>;
};
