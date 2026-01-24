import { useFeatureState } from 'feature-react/state';
import React from 'react';
import { ArrowUpRightIcon, TriangleLeftIcon, TriangleRightIcon } from '@/components';
import { specta } from '@/environment';
import { useSettingsCx } from '@/features/settings';
import { useOnSessionComplete } from '@/hooks';
import { cn, formatDuration, formatRelativeDate, toTuple } from '@/lib';

export const StatsCard: React.FC<TStatsCardProps> = (props) => {
	const {
		views = ['focus-goal', 'last-session'],
		labels = { 'focus-goal': 'Focus Goal', 'last-session': 'Last Session' },
		debug = false,
		className
	} = props;

	const [viewIndex, setViewIndex] = React.useState(0);
	const [focusSeconds, setFocusSeconds] = React.useState(0);
	const [lastWorkSession, setLastWorkSession] = React.useState<specta.SessionDetailDto | null>(
		null
	);

	const settingsCx = useSettingsCx();
	const settings = useFeatureState(settingsCx.$appSettings);

	const currentView = views[viewIndex] ?? 'focus-goal';

	// MARK: - Actions

	const handlePrev = React.useCallback(() => {
		setViewIndex((i) => (i - 1 + views.length) % views.length);
	}, [views.length]);

	const handleNext = React.useCallback(() => {
		setViewIndex((i) => (i + 1) % views.length);
	}, [views.length]);

	const fetchStats = React.useCallback(async () => {
		const [areFocusSecsOk, , focusSecs] = toTuple(await specta.commands.getTodayFocusSeconds());
		if (areFocusSecsOk) {
			setFocusSeconds(focusSecs);
		}

		const [isLastSessionOk, , lastSession] = toTuple(
			// Note: Use same min duration as session list (30s) for consistency
			await specta.commands.getLastWorkSession(30)
		);
		if (isLastSessionOk) {
			setLastWorkSession(lastSession);
		}
	}, []);

	const handleNavigateToLastSession = React.useCallback(async () => {
		if (lastWorkSession == null) {
			return;
		}
		await specta.commands.showHistoryWindowAtSession(lastWorkSession.id);
	}, [lastWorkSession]);

	// MARK: - Effects

	React.useEffect(() => {
		fetchStats();
	}, [fetchStats]);

	useOnSessionComplete(React.useCallback(() => fetchStats(), [fetchStats]));

	// MARK: - UI

	return (
		<div className={cn('flex flex-col px-3 pt-2 pb-3', className)}>
			{/* Header */}
			<div className="flex items-center justify-between">
				{currentView === 'last-session' && lastWorkSession != null ? (
					<button
						type="button"
						onClick={handleNavigateToLastSession}
						className="group flex items-center gap-1"
					>
						<span className="text-base-400 group-hover:text-base-500 text-[10px] font-medium tracking-wider uppercase transition-colors">
							{labels[currentView] ?? currentView}
						</span>
						<ArrowUpRightIcon
							size={10}
							className="text-base-300 group-hover:text-base-500 transition-colors"
						/>
					</button>
				) : (
					<p className="text-base-400 text-[10px] font-medium tracking-wider uppercase">
						{labels[currentView] ?? currentView}
					</p>
				)}
				<div className="-mr-2 flex items-center">
					<button
						type="button"
						onClick={handlePrev}
						className="text-base-300 hover:text-base-500 py-1 pr-0.5 pl-2 transition-colors"
					>
						<TriangleLeftIcon width={6} height={8} preserveAspectRatio="none" />
					</button>
					<button
						type="button"
						onClick={handleNext}
						className="text-base-300 hover:text-base-500 py-1 pr-2 pl-0.5 transition-colors"
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
				<LastSessionView
					lastSession={lastWorkSession}
					debug={debug}
					onNavigate={handleNavigateToLastSession}
				/>
			)}
		</div>
	);
};

const FocusGoalView: React.FC<TFocusGoalViewProps> = (props) => {
	const { focusSeconds, goalMinutes } = props;

	const goalSeconds = goalMinutes * 60;
	const progress = Math.min(focusSeconds / goalSeconds, 1);

	return (
		<div className="mt-2 flex flex-col gap-1">
			<span className="text-base-900 text-sm tabular-nums">
				<span className="font-semibold">{formatDuration(focusSeconds)}</span> /{' '}
				{formatDuration(goalSeconds)}
			</span>
			<div className="bg-base-200 h-1 overflow-hidden rounded-full">
				<div
					className="bg-base-900 h-full transition-[width] duration-500"
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
	const { lastSession, debug = false, onNavigate } = props;

	if (lastSession == null) {
		return (
			<div className="mt-2 flex flex-col gap-1">
				<span className="text-base-400 text-sm">No session yet</span>
			</div>
		);
	}

	const { plannedSeconds, actualSeconds, startedAt, stats } = lastSession;
	const completedSeconds = actualSeconds ?? plannedSeconds;
	const sessionDate = formatRelativeDate(new Date(startedAt));

	return (
		<button type="button" onClick={onNavigate} className="mt-2 flex flex-col gap-1 text-left">
			{/* Duration */}
			<span className="text-base-900 text-sm font-semibold tabular-nums">
				{formatDuration(completedSeconds)}
			</span>

			{/* Status + Date */}
			{debug ? (
				<div className="text-base-400 flex flex-wrap gap-x-2 text-[10px]">
					<span>Base: {formatDuration(plannedSeconds)}</span>
					{stats.extendedSeconds > 0 && <span>Ext: +{formatDuration(stats.extendedSeconds)}</span>}
					{stats.overtimeSeconds > 0 && (
						<span className="text-warning">OT: +{formatDuration(stats.overtimeSeconds)}</span>
					)}
				</div>
			) : (
				<div className="text-base-400 text-[10px]">
					{stats.overtimeSeconds > 0 ? (
						<>
							<span className="text-warning">
								+{formatDuration(stats.overtimeSeconds)} overtime
							</span>
							<span> · {sessionDate}</span>
						</>
					) : (
						<span>{sessionDate}</span>
					)}
				</div>
			)}
		</button>
	);
};

interface TLastSessionViewProps {
	lastSession: specta.SessionDetailDto | null | undefined;
	debug?: boolean;
	onNavigate?: () => void;
}

type TView = 'focus-goal' | 'last-session';

interface TStatsCardProps {
	views?: TView[];
	labels?: Partial<Record<TView, string>>;
	debug?: boolean;
	className?: string;
}
