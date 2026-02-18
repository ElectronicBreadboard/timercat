import { Button, CheckIcon, cn, IconButton, PauseIcon, PlayIcon, XIcon } from '@repo/ui';
import { useNavigate } from '@tanstack/react-router';
import { useCombinedCompute, useFeatureState } from 'feature-react/state';
import React from 'react';
import { useSettingsCx } from '@/features/settings';
import { type TimerCx } from '@/features/timer';

export const CountdownTimerActions: React.FC<TProps> = (props) => {
	const { cx, className } = props;
	const navigate = useNavigate();
	const settingsCx = useSettingsCx();
	const settings = useFeatureState(settingsCx.$appSettings);

	const { status, isOvertime } = useCombinedCompute(
		[cx.$status, cx.$overtimeSeconds] as const,
		([{ value: status = 'idle' }, { value: overtimeSeconds = 0 }]) => ({
			status,
			isOvertime: overtimeSeconds > 0
		})
	);

	const actionSlots = React.useMemo((): {
		left: TActionSlot | null;
		center: TActionSlot | null;
		right: TActionSlot | null;
	} => {
		const handleStart = () => {
			if (!settings.timer.showSessionSetup) {
				cx.start();
			} else {
				navigate({ to: '/window/main/setup', search: { advance: false } });
			}
		};
		const handlePause = () => cx.pause();
		const handleResume = () => cx.resume();
		const handleComplete = () => cx.complete();
		const handleCancel = () => cx.reset();

		// Idle
		if (status === 'idle') {
			return {
				left: null,
				center: { type: 'text', text: 'START', onClick: handleStart },
				right: null
			};
		}

		// Overtime
		if (isOvertime) {
			return {
				left: null,
				center: { type: 'icon', icon: <CheckIcon size={24} />, onClick: handleComplete },
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
			right: null
		};
	}, [status, isOvertime, settings.timer.showSessionSetup, cx, navigate]);

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
	cx: TimerCx;
	className?: string;
}

type TActionSlot =
	| { type: 'none' }
	| { type: 'text'; text: string; onClick: () => void }
	| { type: 'icon'; icon: React.ReactNode; onClick: () => void };
