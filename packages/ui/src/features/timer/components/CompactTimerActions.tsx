import { useCombinedCompute } from 'feature-react/state';
import React from 'react';
import { cn } from '@/lib';
import { type TCountdownCx, type TPomodoroCx, type TProgressivePomodoroCx } from '../modes';
import {
	getCountdownTimerActionSlots,
	getPomodoroTimerActionSlots,
	getProgressiveTimerActionSlots
} from './timer-action-slots';
import { TimerActionSlotsView } from './TimerActionSlotsView';

export const CompactTimerActions: React.FC<TCompactTimerActionsProps> = (props) => {
	const { cx, className } = props;

	const { status, sessionType, isOvertime } = useCombinedCompute(
		[cx.$status, cx.$sessionType, cx.$overtimeSeconds] as const,
		([
			{ value: status = 'idle' },
			{ value: sessionType = 'pomodoro:work' },
			{ value: overtimeSeconds = 0 }
		]) => ({
			status,
			sessionType,
			isOvertime: overtimeSeconds > 0
		})
	);

	const slots = React.useMemo(() => {
		switch (cx.mode) {
			case 'countdown':
				return getCountdownTimerActionSlots(cx, status, isOvertime);
			case 'pomodoro':
				return getPomodoroTimerActionSlots(cx, status, !sessionType.endsWith(':work'), isOvertime);
			case 'progressive':
				return getProgressiveTimerActionSlots(
					cx,
					status,
					!sessionType.endsWith(':work'),
					isOvertime
				);
		}
	}, [cx, status, sessionType, isOvertime]);

	return <TimerActionSlotsView slots={slots} variant="compact" className={cn(className)} />;
};

interface TCompactTimerActionsProps {
	cx: TCountdownCx | TPomodoroCx | TProgressivePomodoroCx;
	className?: string;
}
