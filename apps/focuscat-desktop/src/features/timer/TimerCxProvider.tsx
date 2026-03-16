import { TimerCxProvider as BaseTimerCxProvider, useMemoCleanup } from '@repo/ui';
import { useNavigate } from '@tanstack/react-router';
import { useCompute } from 'feature-react/state';
import React from 'react';
import { useSettingsCx } from '@/features/settings';
import { CountdownTimerCx, PomodoroTimerCx } from './modes';

export const TimerCxProvider: React.FC<TTimerCxProviderProps> = (props) => {
	const { children, enableSideEffects = false } = props;
	const navigate = useNavigate();
	const settingsCx = useSettingsCx();
	const timerMode = useCompute(settingsCx.$appSettings, ({ value }) => value.timer.timerMode);

	const cx = useMemoCleanup(() => {
		const timerCx =
			timerMode === 'countdown'
				? new CountdownTimerCx(settingsCx, navigate, enableSideEffects)
				: new PomodoroTimerCx(settingsCx, navigate, enableSideEffects);
		return [timerCx, () => timerCx.unmount()];
	}, [timerMode]);

	return <BaseTimerCxProvider value={cx}>{children}</BaseTimerCxProvider>;
};

interface TTimerCxProviderProps {
	children: React.ReactNode;
	enableSideEffects?: boolean;
}
