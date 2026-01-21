import { Button } from '@base-ui/react/button';
import { createFileRoute } from '@tanstack/react-router';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useFeatureState } from 'feature-react/state';
import React from 'react';
import {
	BriefcaseIcon,
	CoffeeIcon,
	ExpandIcon,
	GripIcon,
	PauseIcon,
	PlayIcon,
	SkipIcon
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
	const timer = useFeatureState(timerCx.$timer);
	const catRef = React.useRef<TCatRef>(null);

	const isBreak = timer?.phase !== 'work';
	const isOvertime = (timer?.overtimeSeconds ?? 0) > 0;
	const isRunning = timer?.status === 'running';
	const isPaused = timer?.status === 'paused';

	// MARK: - Actions

	const handleExpand = React.useCallback(async () => {
		await specta.commands.showMainWindow();
		await specta.commands.hideCatWindow();
	}, []);

	const handlePlayPause = React.useCallback(async () => {
		if (isRunning) {
			await specta.commands.pauseTimer();
		} else if (isPaused) {
			await specta.commands.resumeTimer();
		} else {
			await specta.commands.startTimer();
		}
	}, [isRunning, isPaused]);

	const handleSkip = React.useCallback(async () => {
		await specta.commands.skipTimer();
	}, []);

	// MARK: - Effects

	useOnInputDetected(React.useCallback(() => catRef.current?.tap(), []));

	// MARK: - UI

	return (
		<div
			className={cn('flex flex-col items-center', settings.debug.cat && 'border border-red-500')}
		>
			<Cat
				ref={catRef}
				size={170}
				className={cn('z-10', settings.debug.cat && 'border border-green-500')}
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

				{/* Phase Indicator */}
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
						{isOvertime
							? `+${formatTime(timer?.overtimeSeconds ?? 0)}`
							: formatTime(timer?.remainingSeconds ?? 0)}
					</span>

					{/* Hover Controls (overlay) */}
					<div className="absolute inset-0 flex items-center justify-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
						<Button
							className="text-base-400 hover:text-base-950 flex items-center p-1 transition-colors"
							onClick={handlePlayPause}
						>
							{isRunning ? <PauseIcon size={14} /> : <PlayIcon size={14} />}
						</Button>
						<Button
							className="text-base-400 hover:text-base-950 flex items-center p-1 transition-colors"
							onClick={handleSkip}
						>
							<SkipIcon size={14} />
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
