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
} from '../../components';
import { cn } from '../../lib';
import { type TTimerCx } from './TimerCx';

export const PomodoroTimerActions: React.FC<TProps> = (props) => {
	const { cx, className } = props;

	const { status, isBreak, isOvertime } = useCombinedCompute(
		[cx.$status, cx.$sessionType, cx.$overtimeSeconds] as const,
		([
			{ value: status = 'idle' },
			{ value: sessionType = 'pomodoro:work' },
			{ value: overtimeSeconds = 0 }
		]) => ({
			status,
			isBreak: !sessionType.endsWith(':work'),
			isOvertime: overtimeSeconds > 0
		})
	);

	const actionSlots = React.useMemo((): {
		left: TActionSlot | null;
		center: TActionSlot | null;
		right: TActionSlot | null;
	} => {
		const handleStart = () => cx.start();
		const handleAdvance = () => cx.advance();
		const handlePause = () => cx.pause();
		const handleResume = () => cx.resume();
		const handleComplete = () => cx.complete();
		const handleCancel = () => cx.reset();

		// Idle
		if (status === 'idle') {
			return {
				left: null,
				center: { type: 'text', text: 'START SESSION', onClick: handleStart },
				right: null
			};
		}

		// Overtime
		if (isOvertime) {
			return {
				left: { type: 'icon', icon: <CheckIcon size={18} />, onClick: handleComplete },
				center: {
					type: 'icon',
					icon: isBreak ? <BriefcaseIcon size={24} /> : <CoffeeIcon size={24} />,
					onClick: handleAdvance
				},
				right: {
					type: 'icon',
					icon: status === 'running' ? <PauseIcon size={18} /> : <PlayIcon size={18} />,
					onClick: status === 'running' ? handlePause : handleResume
				}
			};
		}

		// Running
		if (status === 'running') {
			return {
				left: null,
				center: { type: 'icon', icon: <PauseIcon size={24} />, onClick: handlePause },
				right: null
			};
		}

		// Paused
		return {
			left: { type: 'icon', icon: <XIcon size={18} />, onClick: handleCancel },
			center: { type: 'icon', icon: <PlayIcon size={24} />, onClick: handleResume },
			right: {
				type: 'icon',
				icon: isBreak ? <BriefcaseIcon size={18} /> : <CoffeeIcon size={18} />,
				onClick: handleAdvance
			}
		};
	}, [status, isBreak, isOvertime, cx]);

	function renderSlot(action: TActionSlot | null, slot: 'left' | 'center' | 'right') {
		if (!action || action.type === 'none') {
			return null;
		}

		if (action.type === 'text') {
			return (
				<Button
					variant="primary"
					onClick={action.onClick}
					className="h-12 rounded-full px-8 text-sm font-semibold"
				>
					{action.text}
				</Button>
			);
		}

		const isCenter = slot === 'center';
		return (
			<IconButton
				variant={isCenter ? 'primary' : 'default'}
				onClick={action.onClick}
				className={
					isCenter
						? 'size-14 rounded-full'
						: slot === 'left'
							? 'absolute right-full mr-3 size-11 rounded-full'
							: 'absolute left-full ml-3 size-11 rounded-full'
				}
			>
				{action.icon}
			</IconButton>
		);
	}

	return (
		<div className={cn('relative flex items-center justify-center', className)}>
			{renderSlot(actionSlots.left, 'left')}
			{renderSlot(actionSlots.center, 'center')}
			{renderSlot(actionSlots.right, 'right')}
		</div>
	);
};

interface TProps {
	cx: TTimerCx;
	className?: string;
}

type TActionSlot =
	| { type: 'none'; text?: string }
	| { type: 'text'; text: string; onClick: () => void }
	| { type: 'icon'; icon: React.ReactNode; onClick: () => void };
