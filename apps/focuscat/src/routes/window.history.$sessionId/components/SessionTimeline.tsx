import React from 'react';
import { Tooltip } from '@/components';
import { specta } from '@/environment';
import { cn, formatDurationSeconds } from '@/lib';

export const SessionTimeline: React.FC<TSessionTimelineProps> = (props) => {
	const { session, activities, fallbackColor = '#9ca3af', className } = props;

	const sessionStart = session.startedAt;
	const sessionEnd = session.endedAt ?? Math.floor(Date.now() / 1000);
	const sessionDuration = sessionEnd - sessionStart;

	// Calculate position and width for each activity, tracking window alternation
	const activityBars = React.useMemo(() => {
		if (sessionDuration <= 0) {
			return [];
		}

		let lastBundleId: string | null = null;

		return activities.map((activity, index) => {
			// Use bundle ID for same-app detection (more reliable than app name)
			const bundleId = activity.appBundleId;
			const isSameApp = bundleId != null && bundleId === lastBundleId;
			lastBundleId = bundleId;

			// Clamp activity to session bounds
			const start = Math.max(activity.startedAt, sessionStart);
			const end = Math.min(activity.endedAt, sessionEnd);

			const leftPercent = ((start - sessionStart) / sessionDuration) * 100;
			const widthPercent = ((end - start) / sessionDuration) * 100;

			return {
				activity,
				index,
				leftPercent,
				widthPercent,
				isSameApp
			};
		});
	}, [activities, sessionStart, sessionEnd, sessionDuration]);

	// Group activities by app name for legend, sorted by total time
	const appGroups = React.useMemo(() => {
		const groups = new Map<string, { count: number; totalSeconds: number; color: string | null }>();

		for (const activity of activities) {
			const appName = activity.appName ?? 'Unknown';
			const duration = activity.endedAt - activity.startedAt;
			const existing = groups.get(appName);

			if (existing != null) {
				existing.count += 1;
				existing.totalSeconds += duration;
				// Keep first non-null color found for this app
				if (existing.color == null && activity.appColor != null) {
					existing.color = activity.appColor;
				}
			} else {
				groups.set(appName, { count: 1, totalSeconds: duration, color: activity.appColor });
			}
		}

		return Array.from(groups.entries()).sort((a, b) => b[1].totalSeconds - a[1].totalSeconds);
	}, [activities]);

	// MARK: - UI

	return (
		<div className={cn('flex flex-col gap-4', className)}>
			{/* Timeline Bar */}
			<div className="flex flex-col gap-2">
				<div className="text-base-500 text-xs font-medium">Activity Timeline</div>
				<div className="bg-base-100 relative h-8 overflow-hidden rounded">
					{activityBars.map(({ activity, index, leftPercent, widthPercent, isSameApp }) => (
						<Tooltip
							key={index}
							content={<ActivityTooltipContent activity={activity} />}
							side="top"
						>
							<div
								className={cn(
									'absolute top-0 h-full opacity-90 transition-opacity hover:opacity-100',
									index > 0 &&
										(isSameApp ? 'border-base-900/20 border-l' : 'border-base-900/40 border-l')
								)}
								style={{
									left: `${leftPercent}%`,
									width: `${Math.max(widthPercent, 0.5)}%`,
									backgroundColor: activity.appColor ?? fallbackColor
								}}
							/>
						</Tooltip>
					))}
				</div>
			</div>

			{/* App Legend */}
			{appGroups.length > 0 && (
				<div className="flex flex-col gap-2">
					<div className="text-base-500 text-xs font-medium">Apps</div>
					<div className="flex flex-wrap gap-2">
						{appGroups.slice(0, 8).map(([appName, { totalSeconds, color }]) => (
							<div key={appName} className="flex items-center gap-1.5">
								<div
									className="size-2.5 rounded-sm"
									style={{ backgroundColor: color ?? fallbackColor }}
								/>
								<span className="text-base-600 text-xs">{appName}</span>
								<span className="text-base-400 text-xs">({Math.round(totalSeconds / 60)}m)</span>
							</div>
						))}
					</div>
				</div>
			)}

			{activities.length === 0 && (
				<div className="text-base-400 text-sm">No activity recorded for this session</div>
			)}
		</div>
	);
};

interface TSessionTimelineProps {
	session: specta.SessionDetailDto;
	activities: specta.WindowActivityDto[];
	fallbackColor?: string;
	className?: string;
}

const ActivityTooltipContent: React.FC<TActivityTooltipContentProps> = (props) => {
	const { activity } = props;
	const duration = activity.endedAt - activity.startedAt;

	return (
		<div className="flex max-w-xs items-center gap-2.5">
			{activity.appIcon != null && (
				<img src={activity.appIcon} alt="" className="size-8 shrink-0 rounded" />
			)}
			<div className="flex min-w-0 flex-col gap-0.5">
				<span className="truncate text-sm font-medium">{activity.appName ?? 'Unknown'}</span>
				{activity.windowTitle != null && (
					<span className="text-base-400 truncate text-xs">{activity.windowTitle}</span>
				)}
				<span className="text-base-500 text-xs">{formatDurationSeconds(duration)}</span>
			</div>
		</div>
	);
};

interface TActivityTooltipContentProps {
	activity: specta.WindowActivityDto;
}
