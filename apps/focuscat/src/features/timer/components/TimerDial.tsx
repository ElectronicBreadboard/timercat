import React from 'react';
import { NumberWheel } from '@/components';

export const TimerDial: React.FC<TTimerDialProps> = (props) => {
	const {
		remainingSeconds,
		onChangeMinutes,
		onPreviewMinutes,
		disabled = false,
		className
	} = props;

	// Fractional for smooth countdown animation, ceiling for selection snapping
	const minutes = React.useMemo(() => {
		return disabled ? remainingSeconds / 60 : Math.ceil(remainingSeconds / 60);
	}, [remainingSeconds, disabled]);

	return (
		<NumberWheel
			value={minutes}
			onChange={onChangeMinutes}
			onPreview={onPreviewMinutes}
			min={1}
			max={60}
			labelInterval={5}
			disabled={disabled}
			smooth={disabled}
			className={className}
		/>
	);
};

interface TTimerDialProps {
	remainingSeconds: number;
	onChangeMinutes?: (minutes: number) => void;
	onPreviewMinutes?: (minutes: number) => void;
	disabled?: boolean;
	className?: string;
}
