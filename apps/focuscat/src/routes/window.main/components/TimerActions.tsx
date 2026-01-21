import { useCombinedCompute } from 'feature-react/state';
import React from 'react';
import {
	BriefcaseIcon,
	Button,
	CheckIcon,
	CoffeeIcon,
	IconButton,
	PauseIcon,
	PlayIcon,
	XIcon
} from '@/components';
import { type TimerCx } from '@/features/timer';
import { cn } from '@/lib';

export const TimerActions: React.FC<TTimerActionsProps> = (props) => {
	const { cx, className } = props;

	const { status, phase, isOvertime } = useCombinedCompute(
		[cx.$status, cx.$phase, cx.$overtimeSeconds] as const,
		([{ value: status = 'idle' }, { value: phase = 'work' }, { value: overtimeSeconds = 0 }]) => ({
			status,
			phase,
			isOvertime: overtimeSeconds > 0
		}),
		[],
		{
			isEqual: (a, b) =>
				a.status === b.status && a.phase === b.phase && a.isOvertime === b.isOvertime
		}
	);

	// Left button: Cancel when paused, Finish when in overtime
	const leftButton = React.useMemo((): TIconButton | null => {
		if (status === 'idle') {
			return null;
		}
		if (isOvertime) {
			return { icon: <CheckIcon size={18} />, onClick: () => cx.finish(), visible: true };
		}
		if (status === 'paused') {
			return { icon: <XIcon size={18} />, onClick: () => cx.reset(), visible: true };
		}
		return { icon: <XIcon size={18} />, onClick: () => cx.reset(), visible: false };
	}, [status, isOvertime, cx]);

	// Center button: Start or Skip
	const centerButton = React.useMemo((): { label: React.ReactNode; onClick: () => void } => {
		if (status === 'idle') {
			return { label: 'START SESSION', onClick: () => cx.start() };
		}
		switch (phase) {
			case 'work':
				return { label: <CoffeeIcon size={20} />, onClick: () => cx.skip() };
			case 'shortBreak':
			case 'longBreak':
				return { label: <BriefcaseIcon size={20} />, onClick: () => cx.skip() };
		}
	}, [status, phase, cx]);

	// Right button: Pause/Resume toggle
	const rightButton = React.useMemo((): TIconButton | null => {
		switch (status) {
			case 'idle':
				return null;
			case 'running':
				return { icon: <PauseIcon size={18} />, onClick: () => cx.pause(), visible: true };
			case 'paused':
				return { icon: <PlayIcon size={18} />, onClick: () => cx.resume(), visible: true };
		}
	}, [status, cx]);

	return (
		<div className={cn('relative flex items-center justify-center', className)}>
			{/* Left button */}
			{leftButton != null && (
				<IconButton
					variant="default"
					onClick={leftButton.onClick}
					className={cn(
						'absolute right-full mr-3 size-11 rounded-full',
						!leftButton.visible && 'pointer-events-none opacity-0'
					)}
				>
					{leftButton.icon}
				</IconButton>
			)}

			{/* Center button */}
			<Button
				variant="primary"
				onClick={centerButton.onClick}
				className="h-12 rounded-full px-8 text-sm font-semibold"
			>
				{centerButton.label}
			</Button>

			{/* Right button */}
			{rightButton != null && (
				<IconButton
					variant="default"
					onClick={rightButton.onClick}
					className="absolute left-full ml-3 size-11 rounded-full"
				>
					{rightButton.icon}
				</IconButton>
			)}
		</div>
	);
};

interface TTimerActionsProps {
	cx: TimerCx;
	className?: string;
}

interface TIconButton {
	icon: React.ReactNode;
	onClick: () => void;
	visible: boolean;
}
