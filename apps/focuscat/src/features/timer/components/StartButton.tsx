import React from 'react';
import { specta } from '@/environment';
import { cn } from '@/lib';

export const StartButton: React.FC<TStartButtonProps> = (props) => {
	const { status, onStart, onPause, onResume, className } = props;

	const { label, onClick } = React.useMemo((): { label: string; onClick: () => void } => {
		switch (status) {
			case 'idle':
				return { label: 'START SESSION', onClick: onStart };
			case 'running':
				return { label: 'PAUSE', onClick: onPause };
			case 'paused':
				return { label: 'RESUME', onClick: onResume };
		}
	}, [status, onStart, onPause, onResume]);

	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				'rounded-full bg-red-500 px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-600',
				className
			)}
		>
			{label}
		</button>
	);
};

interface TStartButtonProps {
	status: specta.TimerStatus;
	onStart: () => void;
	onPause: () => void;
	onResume: () => void;
	className?: string;
}
