import React from 'react';
import { type TTimerViewCx } from '../../TimerViewCx';
import { TimeDial } from '../TimeDial';

export const CountdownTimerDial: React.FC<TProps> = (props) => {
	const { cx } = props;

	return (
		<div className="relative flex w-full items-center">
			{/* Border lines */}
			<div className="bg-base-200 absolute inset-x-0 top-0 z-20 h-px" />
			<div className="bg-base-200 absolute inset-x-0 bottom-0 z-20 h-px" />

			<TimeDial cx={cx} />
		</div>
	);
};

interface TProps {
	cx: TTimerViewCx;
}
