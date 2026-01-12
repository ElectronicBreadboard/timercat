import { SkipForwardIcon, XIcon } from 'lucide-react';
import React from 'react';
import { MinimizeIcon } from '@/components';
import { specta } from '@/environment';
import { Cat, TCatRef } from '@/features/cat';
import { cn } from '@/lib';
import { FocusSelector, SessionWheel, StartButton, TimerDial } from './components';
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
		skip,
		setDurationMinutes,
		setCategory,
		setTargetSessions
	} = useTimer();

	const [previewMinutes, setPreviewMinutes] = React.useState<number | null>(null);
	const catRef = React.useRef<TCatRef>(null);
	const lastWholeMinute = React.useRef<number | null>(null);
	const lastTapTime = React.useRef<number>(0);

	const isRunning = state != null && state.status === 'running';
	const isActive = state != null && state.status !== 'idle';
	const isOvertime = state != null && state.remainingSeconds === 0 && state.overtimeSeconds > 0;

	// Use preview value during drag, otherwise use state
	const remainingSeconds = previewMinutes != null ? previewMinutes * 60 : (state?.remainingSeconds ?? 0);

	// Target sessions for the wheel display
	// - When idle: use base settings
	// - When active: use in-session target with fractional progress during work phase
	const displaySessions = React.useMemo(() => {
		if (state == null) {
			return settings.sessionsBeforeLongBreak;
		}

		// When idle, use base settings (so changing settings updates the wheel)
		if (state.status === 'idle') {
			return settings.sessionsBeforeLongBreak;
		}

		// When active (running or paused), use in-session target
		const target = state.targetSessions;

		// Show fractional progress during work phase (both running and paused)
		if (state.phase !== 'work' || state.baseWorkSeconds === 0) {
			return target;
		}

		// Progress through current session based on base work duration
		const elapsed = state.baseWorkSeconds - remainingSeconds;
		const progress = Math.max(0, Math.min(elapsed / state.baseWorkSeconds, 1));
		return target - progress;
	}, [state, settings.sessionsBeforeLongBreak, remainingSeconds]);

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

	const handleDragStart = React.useCallback(() => {
		// Pause timer when user starts adjusting wheels
		if (isRunning) {
			pause();
		}
	}, [isRunning, pause]);

	const handleMinimize = React.useCallback(async () => {
		await specta.commands.showCatWindow();
		await specta.commands.hideMainWindow();
	}, []);

	// MARK: - UI

	if (state == null) {
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

			{/* Top: Focus selector */}
			<FocusSelector
				categories={categories}
				selected={state.category}
				onSelect={setCategory}
				disabled={isRunning}
			/>

			{/* Center: Timer dial with cat + time display */}
			<div className="flex w-full flex-col items-center gap-4">
				{/* Session wheel + Timer dial */}
				<div className="relative flex w-full items-center">
					<Cat ref={catRef} size={150} className="absolute right-4 bottom-full z-10" />
					<SessionWheel
						value={displaySessions}
						onChange={(value) => setTargetSessions(Math.round(value))}
						onDragStart={handleDragStart}
						targetSessions={state.targetSessions}
						sessionsBeforeLongBreak={settings.sessionsBeforeLongBreak}
						smooth={isActive}
					/>
					<TimerDial
						remainingSeconds={state.remainingSeconds}
						onChangeMinutes={handleChangeMinutes}
						onPreviewMinutes={handlePreviewMinutes}
						onDragStart={handleDragStart}
						smooth={isActive}
						className="flex-1"
					/>
				</div>

				{/* Time display */}
				<div className="flex flex-col items-center gap-1">
					<p className={cn(
						'font-mono text-3xl font-light tracking-wider',
						isOvertime ? 'text-orange-500' : 'text-gray-900'
					)}>
						{isOvertime ? `+${formatTime(state.overtimeSeconds)}` : formatTime(remainingSeconds)}
					</p>
					<p className="text-sm text-gray-400">
						{isOvertime ? (
							'Session complete!'
						) : (
							<>
								{formatTimeOfDay(isRunning && startTime != null ? startTime : new Date())} →{' '}
								{formatTimeOfDay(
									isRunning && endTime != null ? endTime : new Date(Date.now() + remainingSeconds * 1000)
								)}
							</>
						)}
					</p>
				</div>
			</div>

			{/* Bottom: Action buttons */}
			<div className="relative flex items-center justify-center">
				{/* Reset button (left of main button) */}
				{state.status === 'paused' && (
					<button
						type="button"
						onClick={reset}
						className="absolute right-full mr-3 flex size-11 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200"
					>
						<XIcon size={18} />
					</button>
				)}

				<StartButton status={state.status} onStart={start} onPause={pause} onResume={resume} />

				{/* Skip button (right of main button) */}
				{isActive && (
					<button
						type="button"
						onClick={skip}
						className="absolute left-full ml-3 flex size-11 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200"
					>
						<SkipForwardIcon size={18} />
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
