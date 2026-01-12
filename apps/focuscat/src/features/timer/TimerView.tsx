import React from 'react';
import { MinimizeIcon, WheelContainer } from '@/components';
import { specta } from '@/environment';
import { Cat, TCatRef } from '@/features/cat';
import { cn, formatTime, formatTimeOfDay } from '@/lib';
import { FocusSelector, SessionWheel, TimerActions, TimerDial } from './components';
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
	// Shows remaining sessions counting down as sessions complete
	const displaySessions = React.useMemo(() => {
		if (state == null || state.status === 'idle') {
			return settings.sessionsBeforeLongBreak;
		}

		// Remaining sessions = target minus already completed
		const remaining = state.targetSessions - state.sessionsCompleted;

		// During breaks, show remaining without progress
		if (state.phase !== 'work' || state.baseWorkSeconds === 0) {
			return remaining;
		}

		// During work, subtract fractional progress through current session
		const elapsed = state.baseWorkSeconds - remainingSeconds;
		const progress = Math.max(0, Math.min(elapsed / state.baseWorkSeconds, 1));
		return remaining - progress;
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

	// MARK: - Effects

	// Tap cat on each second tick while timer is running
	const lastSecond = React.useRef<number | null>(null);
	React.useEffect(() => {
		if (!isRunning || state == null) {
			lastSecond.current = null;
			return;
		}

		const currentSecond = state.remainingSeconds;
		if (lastSecond.current != null && lastSecond.current !== currentSecond) {
			catRef.current?.tap();
		}
		lastSecond.current = currentSecond;
	}, [isRunning, state?.remainingSeconds]);

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
				{/* Timer dial + Session wheel */}
				<div className="relative flex w-full items-center">
					<Cat ref={catRef} size={150} className="absolute right-12 bottom-full z-30" />

					{/* Border lines - full width */}
					<div className="absolute inset-x-0 top-0 z-20 h-px bg-gray-200" />
					<div className="absolute inset-x-0 bottom-0 z-20 h-px bg-gray-200" />

					{/* Timer dial */}
					<WheelContainer direction="horizontal" className="ml-2 flex-1">
						<TimerDial
							remainingSeconds={state.remainingSeconds}
							onChangeMinutes={handleChangeMinutes}
							onPreviewMinutes={handlePreviewMinutes}
							onDragStart={handleDragStart}
							smooth={isActive}
						/>
					</WheelContainer>

					{/* Divider */}
					<div className="h-16 w-px bg-gray-200" />

					{/* Session wheel */}
					<WheelContainer direction="vertical" className="mr-2">
						<SessionWheel
							value={displaySessions}
							onChange={(value) => setTargetSessions(Math.round(value))}
							onDragStart={handleDragStart}
							targetSessions={state.targetSessions}
							sessionsBeforeLongBreak={settings.sessionsBeforeLongBreak}
							smooth={isActive}
						/>
					</WheelContainer>
				</div>

				{/* Time display */}
				<div className="flex flex-col items-center gap-1">
					{isOvertime ? (
						<>
							{/* Total time worked */}
							<p className="font-mono text-3xl font-light tracking-wider text-gray-900">
								{formatTime(state.totalSeconds + state.overtimeSeconds)}
							</p>
							{/* Overtime + category */}
							<p className="text-sm text-gray-400">
								+{formatTime(state.overtimeSeconds)} overtime
								{state.category != null && ` · ${state.category.name}`}
							</p>
						</>
					) : (
						<>
							{/* Remaining time */}
							<p className="font-mono text-3xl font-light tracking-wider text-gray-900">
								{formatTime(remainingSeconds)}
							</p>
							{/* Time range */}
							<p className="text-sm text-gray-400">
								{formatTimeOfDay(isRunning && startTime != null ? startTime : new Date())} →{' '}
								{formatTimeOfDay(
									isRunning && endTime != null ? endTime : new Date(Date.now() + remainingSeconds * 1000)
								)}
							</p>
						</>
					)}
				</div>
			</div>

			{/* Bottom: Action buttons */}
			<TimerActions
				status={state.status}
				phase={state.phase}
				onStart={start}
				onSkip={skip}
				onPause={pause}
				onResume={resume}
				onCancel={reset}
			/>
		</div>
	);
};

// MARK: - Types

interface TTimerViewProps {
	catTapRateLimit?: number;
	className?: string;
}
