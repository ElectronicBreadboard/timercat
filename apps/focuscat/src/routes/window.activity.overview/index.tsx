import { createFileRoute } from '@tanstack/react-router';
import React from 'react';
import { unwrapOr } from 'tuple-result';
import { AppWindowIcon, CodeIcon } from '@/components';
import { specta } from '@/environment';
import { formatTimeOfDayAmPm, toTuple } from '@/lib';
import { SessionTimeline } from '../window.activity.$sessionId/components';
import { UsageSection, type TUsageEntry } from './components';

export const Route = createFileRoute('/window/activity/overview/')({
	loader: async () => {
		const now = Date.now();
		const startedAt = now - 24 * 60 * 60 * 1000;

		const activities = unwrapOr(
			toTuple(
				await specta.commands.getWindowActivities({
					startedAfter: startedAt,
					startedBefore: now,
					limit: null
				})
			),
			[]
		);

		return { startedAt, endedAt: now, activities };
	},
	pendingComponent: LoadingComponent,
	component: RouteComponent
});

function RouteComponent() {
	const { startedAt, endedAt, activities } = Route.useLoaderData();

	const timeRange = `${formatTimeOfDayAmPm(new Date(startedAt))} - ${formatTimeOfDayAmPm(new Date(endedAt))}`;

	// Synthetic session for the timeline (no events = no session markers)
	const syntheticSession: specta.SessionDetailDto = {
		id: -1,
		phase: 'work',
		status: 'completed',
		plannedSeconds: 24 * 60 * 60,
		actualSeconds: 24 * 60 * 60,
		intention: null,
		startedAt,
		endedAt,
		events: [],
		stats: { pausedSeconds: 0, extendedSeconds: 0, overtimeSeconds: 0 }
	};

	// Aggregate time per app
	const appUsage = React.useMemo(() => {
		const appMap = new Map<string, TUsageEntry>();

		for (const activity of activities) {
			const key = activity.appBundleId ?? activity.appName ?? 'Unknown';
			const durationSeconds = (activity.endedAt - activity.startedAt) / 1000;
			const existing = appMap.get(key);

			if (existing != null) {
				existing.totalSeconds += durationSeconds;
			} else {
				appMap.set(key, {
					name: activity.appName ?? 'Unknown',
					icon: activity.appIcon,
					color: activity.appColor,
					totalSeconds: durationSeconds
				});
			}
		}

		return Array.from(appMap.values()).sort((a, b) => b.totalSeconds - a.totalSeconds);
	}, [activities]);

	// Aggregate time per website domain
	const websiteUsage = React.useMemo(() => {
		const domainMap = new Map<string, TUsageEntry>();

		for (const activity of activities) {
			if (activity.websiteDomain == null) {
				continue;
			}
			const durationSeconds = (activity.endedAt - activity.startedAt) / 1000;
			const existing = domainMap.get(activity.websiteDomain);

			if (existing != null) {
				existing.totalSeconds += durationSeconds;
			} else {
				domainMap.set(activity.websiteDomain, {
					name: activity.websiteName ?? activity.websiteDomain,
					icon: activity.websiteIcon,
					color: activity.websiteColor,
					totalSeconds: durationSeconds
				});
			}
		}

		return Array.from(domainMap.values()).sort((a, b) => b.totalSeconds - a.totalSeconds);
	}, [activities]);

	// MARK: - UI

	return (
		<div className="flex flex-col gap-6">
			{/* Header */}
			<div className="flex flex-col gap-1">
				<h2 className="text-base-900 text-lg font-medium">Last 24 Hours</h2>
				<span className="text-base-500 text-sm">{timeRange}</span>
			</div>

			{/* Timeline */}
			<SessionTimeline session={syntheticSession} activities={activities} />

			{/* App Usage */}
			{appUsage.length > 0 && (
				<UsageSection
					title="App Usage"
					entries={appUsage}
					fallbackIcon={<AppWindowIcon size={20} className="text-base-400 shrink-0" />}
				/>
			)}

			{/* Website Usage */}
			{websiteUsage.length > 0 && (
				<UsageSection
					title="Website Usage"
					entries={websiteUsage}
					fallbackIcon={<CodeIcon size={20} className="text-base-400 shrink-0" />}
				/>
			)}
		</div>
	);
}

function LoadingComponent() {
	return (
		<div className="text-base-400 flex h-full items-center justify-center text-sm">
			Loading activity...
		</div>
	);
}
