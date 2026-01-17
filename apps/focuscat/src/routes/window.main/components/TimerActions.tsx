import React from 'react';
import { BriefcaseIcon, CoffeeIcon, PauseIcon, PlayIcon, XIcon } from '@/components';
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
						return { label: <CoffeeIcon size={20} />, onClick: onSkip };
					case 'shortBreak':
					case 'longBreak':
						return { label: <BriefcaseIcon size={20} />, onClick: onSkip };
				}
		}
	}, [status, phase, onStart, onSkip]);

	// Toggle button: pause/play
	const toggle = React.useMemo((): { icon: React.ReactNode; onClick: () => void } | null => {
		switch (status) {
			case 'idle':
				return null;
			case 'running':
				return { icon: <PauseIcon size={18} />, onClick: onPause };
			case 'paused':
				return { icon: <PlayIcon size={18} />, onClick: onResume };
		}
	}, [status, onPause, onResume]);

	return (
		<div className={cn('relative flex items-center justify-center', className)}>
			{/* Cancel button */}
			{status !== 'idle' && (
				<button
					type="button"
					onClick={onCancel}
					className={cn(
						'absolute right-full mr-3 flex size-11 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 transition-colors hover:bg-neutral-200',
						status !== 'paused' && 'pointer-events-none opacity-0'
					)}
				>
					<XIcon size={18} />
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

			{/* Toggle button */}
			{toggle != null && (
				<button
					type="button"
					onClick={toggle.onClick}
					className="absolute left-full ml-3 flex size-11 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 transition-colors hover:bg-neutral-200"
				>
					{toggle.icon}
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
