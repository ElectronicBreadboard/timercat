import { useNavigate } from '@tanstack/react-router';
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
	const navigate = useNavigate();

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

	const { left, center, right } = React.useMemo(() => {
		const isBreak = phase === 'shortBreak' || phase === 'longBreak';
		const skip = isBreak ? 'work' : 'break';

		if (status === 'idle') {
			return { center: 'start' };
		}
		if (isOvertime) {
			return { left: 'done', center: skip, right: status === 'running' ? 'pause' : 'resume' };
		}
		if (status === 'running') {
			return { center: 'pause' };
		}
		return { left: 'cancel', center: 'resume', right: skip };
	}, [status, phase, isOvertime]) as TButtonConfig;

	const handleClick = React.useCallback(
		(action: TAction) => {
			switch (action) {
				case 'start':
				case 'work':
					navigate({ to: '/window/main/setup' });
					break;
				case 'pause':
					cx.pause();
					break;
				case 'resume':
					cx.resume();
					break;
				case 'break':
					cx.skip();
					break;
				case 'done':
					cx.finish();
					break;
				case 'cancel':
					cx.reset();
					break;
			}
		},
		[cx, navigate]
	);

	const icon = (action: TAction, size: number): React.ReactNode => {
		switch (action) {
			case 'start':
				return null;
			case 'pause':
				return <PauseIcon size={size} />;
			case 'resume':
				return <PlayIcon size={size} />;
			case 'break':
				return <CoffeeIcon size={size} />;
			case 'work':
				return <BriefcaseIcon size={size} />;
			case 'done':
				return <CheckIcon size={size} />;
			case 'cancel':
				return <XIcon size={size} />;
		}
	};

	// MARK: - UI

	return (
		<div className={cn('relative flex items-center justify-center', className)}>
			{/* Left button */}
			{left != null && (
				<IconButton
					variant="default"
					onClick={() => handleClick(left)}
					className="absolute right-full mr-3 size-11 rounded-full"
				>
					{icon(left, 18)}
				</IconButton>
			)}

			{/* Center button */}
			{center === 'start' ? (
				<Button
					variant="primary"
					onClick={() => handleClick(center)}
					className="h-12 rounded-full px-8 text-sm font-semibold"
				>
					START SESSION
				</Button>
			) : (
				<IconButton
					variant="primary"
					onClick={() => handleClick(center)}
					className="size-14 rounded-full"
				>
					{icon(center, 24)}
				</IconButton>
			)}

			{/* Right button */}
			{right != null && (
				<IconButton
					variant="default"
					onClick={() => handleClick(right)}
					className="absolute left-full ml-3 size-11 rounded-full"
				>
					{icon(right, 18)}
				</IconButton>
			)}
		</div>
	);
};

interface TTimerActionsProps {
	cx: TimerCx;
	className?: string;
}

type TAction = 'start' | 'pause' | 'resume' | 'break' | 'work' | 'done' | 'cancel';

interface TButtonConfig {
	left?: TAction;
	center: TAction;
	right?: TAction;
}
