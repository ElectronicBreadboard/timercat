import { Button } from '@base-ui/react/button';
import { createFileRoute } from '@tanstack/react-router';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useCombinedCompute, useFeatureState } from 'feature-react/state';
import React from 'react';
import {
	BriefcaseIcon,
	CoffeeIcon,
	ExpandIcon,
	GripIcon,
	PauseIcon,
	PlayIcon,
	SkipForwardIcon
} from '@/components';
import { specta } from '@/environment';
import { Cat, type TCatRef } from '@/features/cat';
import { useSettingsCx } from '@/features/settings';
import { useTimerCx } from '@/features/timer';
import { useOnInputDetected } from '@/hooks';
import { cn, formatTime } from '@/lib';

export const Route = createFileRoute('/window/cat/')({
	component: RouteComponent
});

function RouteComponent() {
	const settingsCx = useSettingsCx();
	const settings = useFeatureState(settingsCx.$appSettings);
	const timerCx = useTimerCx();
	const catRef = React.useRef<TCatRef>(null);

	const { isBreak, isOvertime, isRunning, isPaused, displayTime } = useCombinedCompute(
		[
			timerCx.$status,
			timerCx.$sessionType,
			timerCx.$remainingSeconds,
			timerCx.$overtimeSeconds
		] as const,
		([
			{ value: status = 'idle' },
			{ value: sessionType = 'pomodoro:work' },
			{ value: remainingSeconds = 0 },
			{ value: overtimeSeconds = 0 }
		]) => {
			const isOvertime = overtimeSeconds > 0;

			return {
				isBreak: !sessionType.endsWith(':work'),
				isOvertime,
				isRunning: status === 'running',
				isPaused: status === 'paused',
				displayTime: isOvertime ? `+${formatTime(overtimeSeconds)}` : formatTime(remainingSeconds)
			};
		},
		[],
		{
			isEqual: (a, b) =>
				a.isBreak === b.isBreak &&
				a.isOvertime === b.isOvertime &&
				a.isRunning === b.isRunning &&
				a.isPaused === b.isPaused &&
				a.displayTime === b.displayTime
		}
	);

	// MARK: - Actions

	const handleExpand = React.useCallback(async () => {
		await specta.commands.showMainWindow();
		await specta.commands.hideCatWindow();
	}, []);

	const handlePauseResume = React.useCallback(async () => {
		if (isRunning) {
			await timerCx.pause();
		} else if (isPaused) {
			await timerCx.resume();
		} else {
			await timerCx.start();
		}
	}, [timerCx, isRunning, isPaused]);

	const handleAdvance = React.useCallback(async () => {
		await timerCx.advance();
	}, [timerCx]);

	const handleCatTap = React.useCallback(() => {
		specta.commands.playSound('meow');
	}, []);

	// MARK: - Effects

	useOnInputDetected(React.useCallback(() => catRef.current?.tap({ cooldown: 0 }), []));

	// MARK: - UI

	return (
		<div
			className={cn(
				'flex h-screen flex-col items-center overflow-hidden',
				settings.debug.cat && 'border border-red-500'
			)}
		>
			<Cat
				ref={catRef}
				face={settings.cat.equippedFace}
				hat={settings.cat.equippedHat}
				size={170}
				className={cn('z-10', settings.debug.cat && 'border border-green-500')}
				onTap={handleCatTap}
			/>

			<div
				className={cn(
					'bg-base-100 flex items-center rounded-lg shadow-lg',
					settings.debug.cat && 'border border-blue-500'
				)}
			>
				{/* Drag Handle */}
				<div
					className="flex cursor-grab items-center px-2 py-2 active:cursor-grabbing"
					onPointerDown={(e) => {
						if (e.button === 0) {
							getCurrentWindow().startDragging();
						}
					}}
				>
					<GripIcon size={14} className="text-base-500" />
				</div>

				{/* Session Type Indicator */}
				{isBreak ? (
					<CoffeeIcon size={14} className="text-base-400" />
				) : (
					<BriefcaseIcon size={14} className="text-base-400" />
				)}

				<div className="group relative flex min-w-[48px] items-center justify-center px-2">
					{/* Timer */}
					<span
						className={cn(
							'text-center font-mono text-sm transition-opacity select-none group-hover:opacity-0',
							isOvertime ? 'text-warning' : isRunning ? 'text-base-950' : 'text-base-400'
						)}
					>
						{displayTime}
					</span>

					{/* Hover Controls (overlay) */}
					<div className="absolute inset-0 flex items-center justify-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
						<Button
							className="text-base-400 hover:text-base-950 flex items-center p-1 transition-colors"
							onClick={handlePauseResume}
						>
							{isRunning ? <PauseIcon size={14} /> : <PlayIcon size={14} />}
						</Button>
						<Button
							className="text-base-400 hover:text-base-950 flex items-center p-1 transition-colors"
							onClick={handleAdvance}
						>
							<SkipForwardIcon size={14} />
						</Button>
					</div>
				</div>

				{/* Expand Button */}
				<Button
					className="text-base-400 hover:text-base-950 flex items-center px-2 py-2 transition-colors"
					onClick={handleExpand}
				>
					<ExpandIcon size={14} />
				</Button>
			</div>
		</div>
	);
}
