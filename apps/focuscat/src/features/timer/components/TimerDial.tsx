import React from 'react';
import { NumberWheel } from '@/components';

export const TimerDial: React.FC<TTimerDialProps> = (props) => {
	const { remainingSeconds, onChangeMinutes, onPreviewMinutes, onDragStart, smooth = false, className } = props;

	// Fractional for smooth countdown animation, ceiling for selection snapping
	const minutes = React.useMemo(() => {
		return smooth ? remainingSeconds / 60 : Math.ceil(remainingSeconds / 60);
	}, [remainingSeconds, smooth]);

	return (
		<NumberWheel
			value={minutes}
			onChange={onChangeMinutes}
			onPreview={onPreviewMinutes}
			onDragStart={onDragStart}
			min={0}
			max={60}
			labelInterval={5}
			smooth={smooth}
			className={className}
		/>
	);
};

interface TTimerDialProps {
	remainingSeconds: number;
	onChangeMinutes?: (minutes: number) => void;
	onPreviewMinutes?: (minutes: number) => void;
	onDragStart?: () => void;
	smooth?: boolean;
	className?: string;
}
