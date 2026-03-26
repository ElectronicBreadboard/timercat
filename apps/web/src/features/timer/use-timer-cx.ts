import { useTimerCx as useBaseTimerCx } from '@repo/ui';
import { CountdownTimerCx, PomodoroTimerCx } from './modes';

export function useTimerCx<
	GTimerCx extends CountdownTimerCx | PomodoroTimerCx = CountdownTimerCx | PomodoroTimerCx
>(): GTimerCx {
	return useBaseTimerCx();
}
