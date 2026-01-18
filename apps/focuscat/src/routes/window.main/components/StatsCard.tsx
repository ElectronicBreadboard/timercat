import { useFeatureState } from 'feature-react/state';
import React from 'react';
import { TriangleLeftIcon, TriangleRightIcon } from '@/components';
import { specta } from '@/environment';
import { useSettingsCx } from '@/features/settings';
import { useTimerCx } from '@/features/timer';
import { cn, formatDuration } from '@/lib';

export const StatsCard: React.FC<TStatsCardProps> = (props) => {
	const {
		views = ['focus-goal', 'last-session'],
		labels = { 'focus-goal': 'Focus Goal', 'last-session': 'Last Session' },
		debug = false,
		className
	} = props;

	const [viewIndex, setViewIndex] = React.useState(0);
	const [focusSeconds, setFocusSeconds] = React.useState(0);

	const settingsCx = useSettingsCx();
	const settings = useFeatureState(settingsCx.$appSettings);
	const timerCx = useTimerCx();
	const timer = useFeatureState(timerCx.$timer);

	const currentView = views[viewIndex] ?? 'focus-goal';

	// MARK: - Actions

	const handlePrev = React.useCallback(() => {
		setViewIndex((i) => (i - 1 + views.length) % views.length);
	}, [views.length]);

	const handleNext = React.useCallback(() => {
		setViewIndex((i) => (i + 1) % views.length);
	}, [views.length]);

	const fetchFocusSeconds = React.useCallback(async () => {
		const result = await specta.commands.getTodayFocusSeconds();
		if (result.status === 'ok') {
			setFocusSeconds(result.data);
		}
	}, []);

	// MARK: - Effects

	React.useEffect(() => {
		fetchFocusSeconds();
	}, [fetchFocusSeconds]);

	React.useEffect(() => {
		let lastPhase: string | null = null;

		const unlistenPromise = specta.events.timerUpdatedEvent.listen((event) => {
			const currentPhase = event.payload.phase;
			// Refresh when phase changes (session completed)
			if (lastPhase != null && lastPhase !== currentPhase) {
				fetchFocusSeconds();
			}
			lastPhase = currentPhase;
		});

		return () => {
			unlistenPromise.then((unlisten) => unlisten());
		};
	}, [fetchFocusSeconds]);

	// MARK: - UI

	return (
		<div className={cn('flex flex-col px-3 pt-2 pb-3', className)}>
			{/* Header */}
			<div className="flex items-center justify-between">
				<p className="text-[10px] font-medium tracking-wider text-gray-400 uppercase">
					{labels[currentView] ?? currentView}
				</p>
				<div className="flex items-center gap-1">
					<button
						type="button"
						onClick={handlePrev}
						className="text-gray-300 transition-colors hover:text-gray-500"
					>
						<TriangleLeftIcon width={6} height={8} preserveAspectRatio="none" />
					</button>
					<button
						type="button"
						onClick={handleNext}
						className="text-gray-300 transition-colors hover:text-gray-500"
					>
						<TriangleRightIcon width={6} height={8} preserveAspectRatio="none" />
					</button>
				</div>
			</div>

			{/* Content */}
			{currentView === 'focus-goal' && (
				<FocusGoalView
					focusSeconds={focusSeconds}
					goalMinutes={settings.focusGoal.dailyGoalMinutes}
				/>
			)}
			{currentView === 'last-session' && (
				<LastSessionView lastSession={timer?.lastWorkSession} debug={debug} />
			)}
		</div>
	);
};

const FocusGoalView: React.FC<TFocusGoalViewProps> = (props) => {
	const { focusSeconds, goalMinutes } = props;

	const goalSeconds = goalMinutes * 60;
	const progress = Math.min(focusSeconds / goalSeconds, 1);
	const focusMinutes = Math.floor(focusSeconds / 60);

	return (
		<div className="mt-2 flex flex-col gap-1">
			<span className="text-sm text-gray-900 tabular-nums">
				<span className="font-semibold">{formatDuration(focusMinutes)}</span> /{' '}
				{formatDuration(goalMinutes)}
			</span>
			<div className="h-1 overflow-hidden rounded-full bg-gray-200">
				<div
					className="h-full bg-gray-900 transition-[width] duration-500"
					style={{ width: `${progress * 100}%` }}
				/>
			</div>
		</div>
	);
};

interface TFocusGoalViewProps {
	focusSeconds: number;
	goalMinutes: number;
}

const LastSessionView: React.FC<TLastSessionViewProps> = (props) => {
	const { lastSession, debug = false } = props;

	if (lastSession == null) {
		return (
			<div className="mt-2 flex flex-col gap-1">
				<span className="text-sm text-gray-400">No session yet</span>
			</div>
		);
	}

	const completedMinutes = Math.floor(lastSession.completedSeconds / 60);
	const baseMinutes = Math.floor(lastSession.baseSeconds / 60);
	const extendedMinutes = Math.floor(lastSession.extendedSeconds / 60);
	const overtimeMinutes = Math.floor(lastSession.overtimeSeconds / 60);

	return (
		<div className="mt-2 flex flex-col gap-1">
			<span className="text-sm font-semibold text-gray-900 tabular-nums">
				{formatDuration(completedMinutes)}
			</span>
			{debug ? (
				<div className="flex flex-wrap gap-x-2 text-[10px] text-gray-400">
					<span>Base: {formatDuration(baseMinutes)}</span>
					{extendedMinutes > 0 && <span>Ext: +{formatDuration(extendedMinutes)}</span>}
					{overtimeMinutes > 0 && <span>OT: +{formatDuration(overtimeMinutes)}</span>}
				</div>
			) : (
				<div className="text-[10px] text-gray-400">
					{overtimeMinutes > 0 ? (
						<span>+{formatDuration(overtimeMinutes)} overtime</span>
					) : (
						<span>Completed</span>
					)}
				</div>
			)}
		</div>
	);
};

interface TLastSessionViewProps {
	lastSession: specta.WorkSessionStats | null | undefined;
	debug?: boolean;
}

type TView = 'focus-goal' | 'last-session';

interface TStatsCardProps {
	views?: TView[];
	labels?: Partial<Record<TView, string>>;
	debug?: boolean;
	className?: string;
}
