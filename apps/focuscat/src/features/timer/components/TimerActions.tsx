import { Briefcase, Coffee, Pause, Play, X } from 'lucide-react';
import React from 'react';
import { specta } from '@/environment';
import { cn } from '@/lib';

export const TimerActions: React.FC<TTimerActionsProps> = (props) => {
	const { status, phase, onStart, onSkip, onPause, onResume, onCancel, className } = props;

	// Primary button content based on status and phase
	const primary = React.useMemo((): { label: React.ReactNode; onClick: () => void } => {
		switch (status) {
			case 'idle':
				return { label: 'START SESSION', onClick: onStart };
			case 'running':
			case 'paused':
				switch (phase) {
					case 'work':
						return { label: <Coffee size={20} />, onClick: onSkip };
					case 'shortBreak':
					case 'longBreak':
						return { label: <Briefcase size={20} />, onClick: onSkip };
				}
		}
	}, [status, phase, onStart, onSkip]);

	// Secondary button: pause/play toggle
	const secondary = React.useMemo((): { icon: React.ReactNode; onClick: () => void } | null => {
		switch (status) {
			case 'idle':
				return null;
			case 'running':
				return { icon: <Pause size={18} />, onClick: onPause };
			case 'paused':
				return { icon: <Play size={18} />, onClick: onResume };
		}
	}, [status, onPause, onResume]);

	const isIdle = status === 'idle';
	const isPaused = status === 'paused';

	return (
		<div className={cn('relative flex items-center justify-center', className)}>
			{/* Cancel button (left side, shown when paused) */}
			{!isIdle && (
				<button
					type="button"
					onClick={onCancel}
					className={cn(
						'absolute right-full mr-3 flex size-11 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200',
						!isPaused && 'pointer-events-none opacity-0'
					)}
				>
					<X size={18} />
				</button>
			)}

			{/* Primary button */}
			<button
				type="button"
				onClick={primary.onClick}
				className="flex h-12 items-center justify-center rounded-full bg-blue-500 px-8 text-sm font-semibold text-white transition-colors hover:bg-blue-600"
			>
				{primary.label}
			</button>

			{/* Secondary button (right side, pause/play) */}
			{secondary != null && (
				<button
					type="button"
					onClick={secondary.onClick}
					className="absolute left-full ml-3 flex size-11 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200"
				>
					{secondary.icon}
				</button>
			)}
		</div>
	);
};

interface TTimerActionsProps {
	status: specta.TimerStatus;
	phase: specta.TimerPhase;
	onStart: () => void;
	onSkip: () => void;
	onPause: () => void;
	onResume: () => void;
	onCancel: () => void;
	className?: string;
}
