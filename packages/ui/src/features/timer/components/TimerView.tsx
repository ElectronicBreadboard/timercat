import { useCompute, useFeatureState } from 'feature-react/state';
import React from 'react';
import { Badge } from '@/components';
import { cn } from '@/lib';
import { type TTimerViewCx } from '../TimerViewCx';
import { CountdownTimerActions } from './CountdownTimerActions';
import { CountdownTimerDial } from './CountdownTimerDial';
import { PomodoroTimerActions } from './PomodoroTimerActions';
import { PomodoroTimerDial } from './PomodoroTimerDial';
import { TimeDisplay } from './TimeDisplay';

export const TimerView: React.FC<TTimerViewProps> = (props) => {
	const { cx, className, style } = props;
	const timerMode = useFeatureState(cx.$timerMode);
	const speed = useFeatureState(cx.timer.$speed);
	const showSpeed = useCompute(cx.$config, ({ value }) => value.dev.showSpeed);

	// MARK: - UI

	return (
		<div className={cn('flex flex-col items-center pb-8', className)} style={style}>
			{timerMode === 'countdown' ? <CountdownTimerDial cx={cx} /> : <PomodoroTimerDial cx={cx} />}

			<TimeDisplay cx={cx} className="mt-4" />

			{showSpeed && speed > 1 && (
				<Badge variant="warning" className="mt-1 font-mono">
					{speed}x
				</Badge>
			)}

			{timerMode === 'countdown' ? (
				<CountdownTimerActions cx={cx.timer} className="mt-auto" />
			) : (
				<PomodoroTimerActions cx={cx.timer} className="mt-auto" />
			)}
		</div>
	);
};

interface TTimerViewProps {
	cx: TTimerViewCx;
	className?: string;
	style?: React.CSSProperties;
}
