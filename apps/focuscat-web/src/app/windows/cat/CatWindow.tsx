import { Button } from '@base-ui/react/button';
import {
	BriefcaseIcon,
	Cat,
	cn,
	CoffeeIcon,
	ExpandIcon,
	formatTime,
	GripIcon,
	mq,
	PauseIcon,
	PlayIcon,
	SkipForwardIcon,
	useMediaQuery,
	type TCatRef
} from '@repo/ui';
import { useCombinedCompute, useFeatureState } from 'feature-react/state';
import React from 'react';
import { useAudioCx } from '@/features/audio';
import { useSettingsCx } from '@/features/settings';
import { useTimerCx } from '@/features/timer';

export const CatWindow: React.FC<TCatWindowProps> = (props) => {
	const { onExpand } = props;
	const settingsCx = useSettingsCx();
	const settings = useFeatureState(settingsCx.$appSettings);
	const timerCx = useTimerCx();
	const audioCx = useAudioCx();
	const catRef = React.useRef<TCatRef>(null);
	const isMobile = useMediaQuery(mq.max(mq.sm));

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

	const handleExpand = React.useCallback(() => {
		onExpand();
	}, [onExpand]);

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
		if ('advance' in timerCx) {
			await timerCx.advance();
		}
	}, [timerCx]);

	const handleCatTap = React.useCallback(() => {
		audioCx.playSound('meow');
	}, [audioCx]);

	// MARK: - UI

	return (
		<div
			className={cn(
				'flex h-full flex-col items-center overflow-hidden',
				settings.developer.cat && 'border border-red-500'
			)}
		>
			<Cat
				ref={catRef}
				face={settings.cat.equippedFace}
				hat={settings.cat.equippedHat}
				size={isMobile ? 210 : 170}
				className={cn('z-10', settings.developer.cat && 'border border-green-500')}
				onTap={handleCatTap}
			/>

			<div
				className={cn(
					'bg-base-100 flex items-center rounded-lg shadow-lg',
					settings.developer.cat && 'border border-blue-500'
				)}
			>
				{/* Drag Handle */}
				<div
					data-drag-region
					className="flex cursor-grab items-center px-3 py-3 active:cursor-grabbing sm:px-2 sm:py-2"
				>
					<GripIcon className="text-base-500 size-4 sm:size-3.5" />
				</div>

				{/* Session Type Indicator */}
				{isBreak ? (
					<CoffeeIcon className="text-base-400 size-4 sm:size-3.5" />
				) : (
					<BriefcaseIcon className="text-base-400 size-4 sm:size-3.5" />
				)}

				<div className="group relative flex items-center justify-center px-2">
					{/* Timer */}
					<span
						className={cn(
							'text-center font-mono text-base transition-opacity select-none group-hover:opacity-0 sm:text-sm',
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
							{isRunning ? <PauseIcon className="size-3.5" /> : <PlayIcon className="size-3.5" />}
						</Button>
						<Button
							className="text-base-400 hover:text-base-950 flex items-center p-1 transition-colors"
							onClick={handleAdvance}
						>
							<SkipForwardIcon className="size-3.5" />
						</Button>
					</div>
				</div>

				{/* Expand Button */}
				<Button
					className="text-base-400 hover:text-base-950 flex items-center px-3 py-3 transition-colors sm:px-2 sm:py-2"
					onClick={handleExpand}
				>
					<ExpandIcon className="size-4 sm:size-3.5" />
				</Button>
			</div>
		</div>
	);
};

export interface TCatWindowProps {
	onExpand: () => void;
}
