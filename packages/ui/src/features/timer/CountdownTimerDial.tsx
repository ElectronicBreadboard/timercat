import React from 'react';
import { TimeDial } from './TimeDial';
import { type TTimerCx } from './TimerCx';

export const CountdownTimerDial: React.FC<TProps> = (props) => {
	const { cx, previewMinutes, onPreviewChange } = props;

	return (
		<div className="relative flex w-full items-center">
			{/* Border lines */}
			<div className="bg-base-200 absolute inset-x-0 top-0 z-20 h-px" />
			<div className="bg-base-200 absolute inset-x-0 bottom-0 z-20 h-px" />

			<TimeDial cx={cx} previewMinutes={previewMinutes} onPreviewChange={onPreviewChange} />
		</div>
	);
};

interface TProps {
	cx: TTimerCx;
	previewMinutes: number | null;
	onPreviewChange?: (minutes: number | null) => void;
}
