import { XIcon } from 'lucide-react';
import React from 'react';
import { MinimizeIcon } from '@/components';
import { specta } from '@/environment';
import { Cat, TCatRef } from '@/features/cat';
import { cn } from '@/lib';
import { FocusSelector, SessionDots, StartButton, TimerDial } from './components';
import { useTimer } from './hooks';

export const TimerView: React.FC<TTimerViewProps> = (props) => {
	const { catTapRateLimit = 100, className } = props;

	const {
		state,
		settings,
		categories,
		startTime,
		endTime,
		start,
		pause,
		resume,
		reset,
		setDurationMinutes,
		setCategory
	} = useTimer();

	const [previewMinutes, setPreviewMinutes] = React.useState<number | null>(null);
	const catRef = React.useRef<TCatRef>(null);
	const lastWholeMinute = React.useRef<number | null>(null);
	const lastTapTime = React.useRef<number>(0);

	const isRunning = React.useMemo(() => {
		return state != null && state.status !== 'idle';
	}, [state]);

	const displaySeconds = React.useMemo(() => {
		return previewMinutes != null ? previewMinutes * 60 : (state?.remainingSeconds ?? 0);
	}, [previewMinutes, state?.remainingSeconds]);

	// MARK: - Actions

	const handlePreviewMinutes = React.useCallback(
		(minutes: number) => {
			setPreviewMinutes(minutes);

			// Tap cat when crossing minute boundaries
			const wholeMinute = Math.round(minutes);
			if (lastWholeMinute.current != null && lastWholeMinute.current !== wholeMinute) {
				const now = Date.now();
				if (now - lastTapTime.current >= catTapRateLimit) {
					catRef.current?.tap();
					lastTapTime.current = now;
				}
			}
			lastWholeMinute.current = wholeMinute;
		},
		[catTapRateLimit]
	);

	const handleChangeMinutes = React.useCallback(
		(minutes: number) => {
			setPreviewMinutes(null);
			lastWholeMinute.current = null;
			setDurationMinutes(minutes);
		},
		[setDurationMinutes]
	);

	const handleMinimize = React.useCallback(async () => {
		await specta.commands.showCatWindow();
		await specta.commands.hideMainWindow();
	}, []);

	// MARK: - UI

	if (state == null || settings == null) {
		return (
			<div className={cn('flex items-center justify-center', className)}>
				<p className="text-gray-400">Loading...</p>
			</div>
		);
	}

	return (
		<div className={cn('relative flex flex-col items-center justify-between py-8', className)}>
			{/* Minimize button */}
			<button
				type="button"
				onClick={handleMinimize}
				className="absolute top-4 left-4 flex size-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
			>
				<MinimizeIcon size={18} />
			</button>

			{/* Top: Session progress + Focus selector */}
			<div className="flex flex-col items-center gap-3">
				<SessionDots total={settings.sessionsBeforeLongBreak} completed={state.sessionsCompleted} />
				<FocusSelector
					categories={categories}
					selected={state.category}
					onSelect={setCategory}
					disabled={isRunning}
				/>
			</div>

			{/* Center: Timer dial with cat + time display */}
			<div className="flex w-full flex-col items-center gap-4">
				<div className="relative w-full">
					<Cat ref={catRef} size={150} className="absolute right-4 bottom-full z-10" />
					<TimerDial
						remainingSeconds={state.remainingSeconds}
						onChangeMinutes={handleChangeMinutes}
						onPreviewMinutes={handlePreviewMinutes}
						disabled={isRunning}
					/>
				</div>

				{/* Time display */}
				<div className="flex flex-col items-center gap-1">
					<p className="font-mono text-3xl font-light tracking-wider text-gray-900">
						{formatTime(displaySeconds)}
					</p>
					<p className="text-sm text-gray-400">
						{formatTimeOfDay(isRunning && startTime != null ? startTime : new Date())} →{' '}
						{formatTimeOfDay(
							isRunning && endTime != null ? endTime : new Date(Date.now() + displaySeconds * 1000)
						)}
					</p>
				</div>
			</div>

			{/* Bottom: Action buttons */}
			<div className="relative flex items-center justify-center">
				<StartButton status={state.status} onStart={start} onPause={pause} onResume={resume} />
				{state.status === 'paused' && (
					<button
						type="button"
						onClick={reset}
						className="absolute left-full ml-3 flex size-11 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200"
					>
						<XIcon size={18} />
					</button>
				)}
			</div>
		</div>
	);
};

// MARK: - Helpers

function formatTime(seconds: number): string {
	const mins = Math.floor(seconds / 60);
	const secs = seconds % 60;
	return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function formatTimeOfDay(date: Date): string {
	return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

// MARK: - Types

interface TTimerViewProps {
	catTapRateLimit?: number;
	className?: string;
}
