import React from 'react';
import {
	BriefcaseIcon,
	Button,
	CoffeeIcon,
	IconButton,
	PauseIcon,
	PlayIcon,
	XIcon
} from '@/components';
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
				<IconButton
					variant="default"
					onClick={onCancel}
					className={cn(
						'absolute right-full mr-3 size-11 rounded-full',
						status !== 'paused' && 'pointer-events-none opacity-0'
					)}
				>
					<XIcon size={18} />
				</IconButton>
			)}

			{/* Primary button */}
			<Button
				variant="primary"
				onClick={primary.onClick}
				className="h-12 rounded-full px-8 text-sm font-semibold"
			>
				{primary.label}
			</Button>

			{/* Toggle button */}
			{toggle != null && (
				<IconButton
					variant="default"
					onClick={toggle.onClick}
					className="absolute left-full ml-3 size-11 rounded-full"
				>
					{toggle.icon}
				</IconButton>
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
