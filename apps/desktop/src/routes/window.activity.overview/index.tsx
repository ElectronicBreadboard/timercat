import { AppWindowIcon, ChevronLeftIcon, cn, CodeIcon, formatDuration } from '@repo/ui';
import { createFileRoute, useRouter } from '@tanstack/react-router';
import React from 'react';
import { unwrapOr } from 'tuple-result';
import { specta } from '@/environment';
import { usePlatform } from '@/hooks';
import { getLocalDateKey, parseLocalDateKey, parseSearchDate, toTuple } from '@/lib';
import { ActivityBalanceChart, FocusPulse, UsageSection, type TUsageEntry } from './components';

export const Route = createFileRoute('/window/activity/overview/')({
	validateSearch: (search: Record<string, unknown>): { date: string } => ({
		date: parseSearchDate(search['date']) ?? getLocalDateKey(new Date())
	}),
	loaderDeps: ({ search }) => ({ date: search.date }),
	loader: async ({ deps }) => {
		const startOfDay = parseLocalDateKey(deps.date) ?? new Date();
		startOfDay.setHours(0, 0, 0, 0);
		const startedAt = startOfDay.getTime();
		const endedAt = startedAt + 86_400_000;
		const now = Date.now();
		const dayEnd = deps.date === getLocalDateKey(new Date()) ? now : endedAt;

		const activities = unwrapOr(
			toTuple(
				await specta.commands.getWindowActivities({
					startedAfter: startedAt,
					startedBefore: dayEnd,
					limit: null
				})
			),
			[]
		);

		return { date: deps.date, startedAt, activities };
	},
	pendingComponent: LoadingComponent,
	component: RouteComponent
});

function RouteComponent() {
	const { date, startedAt, activities } = Route.useLoaderData();
	const { date: currentDate } = Route.useSearch();
	const router = useRouter();
	const platform = usePlatform();

	const totalTrackedSeconds = React.useMemo(
		() => activities.reduce((sum, a) => sum + (a.endedAt - a.startedAt) / 1000, 0),
		[activities]
	);

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

	const websiteUsage = React.useMemo(() => {
		const domainMap = new Map<string, TUsageEntry>();
		for (const activity of activities) {
			if (activity.websiteDomain == null) continue;
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

	const selectedDate = React.useMemo(() => new Date(startedAt), [startedAt]);
	const dateLabel = React.useMemo(
		() =>
			selectedDate.toLocaleDateString('en-US', {
				month: 'long',
				day: 'numeric'
			}),
		[selectedDate]
	);
	const isToday = date === getLocalDateKey(new Date());
	const trackedLabel = isToday ? 'tracked today' : `tracked on ${dateLabel}`;

	const navigateDay = React.useCallback(
		(dayDelta: number) => {
			const nextDate = parseLocalDateKey(currentDate) ?? new Date();
			nextDate.setHours(0, 0, 0, 0);
			nextDate.setDate(nextDate.getDate() + dayDelta);
			void router.navigate({
				to: '/window/activity/overview',
				search: { date: getLocalDateKey(nextDate) }
			});
		},
		[currentDate, router]
	);

	// MARK: - UI

	return (
		<>
			{/* Header */}
			<header
				data-tauri-drag-region
				className={cn('shrink-0 select-none', platform === 'macos' ? 'h-8' : 'h-2')}
			/>

			{/* Content */}
			<main className="flex-1 overflow-y-auto p-4">
				<div className="flex flex-col gap-6">
					{/* Total tracked time + back + date */}
					<div className="flex items-center gap-1">
						<button
							onClick={() => void router.navigate({ to: '/window/activity' })}
							className="text-base-500 hover:text-base-700 mt-1.5 flex items-center self-start rounded transition-colors"
							aria-label="Back to activity sessions"
						>
							<ChevronLeftIcon size={18} />
						</button>
						<div className="flex flex-1 flex-col gap-0.5">
							<div className="flex items-baseline justify-between">
								<span className="text-base-900 text-2xl font-semibold tabular-nums">
									{formatDuration(totalTrackedSeconds)}
								</span>
								<div className="flex items-center gap-1">
									<button
										onClick={() => navigateDay(-1)}
										className="text-base-400 hover:text-base-700 flex items-center rounded transition-colors"
										aria-label="View previous day"
									>
										<ChevronLeftIcon size={14} />
									</button>
									<span className="text-base-400 min-w-18 text-center text-xs">{dateLabel}</span>
									<button
										onClick={() => navigateDay(1)}
										disabled={isToday}
										className="text-base-400 hover:text-base-700 flex items-center rounded transition-colors disabled:opacity-30"
										aria-label="View next day"
									>
										<ChevronLeftIcon size={14} className="rotate-180" />
									</button>
								</div>
							</div>
							<span className="text-base-400 text-xs">{trackedLabel}</span>
						</div>
					</div>

					{/* Activity balance chart + Focus Pulse */}
					<div className="flex items-start gap-4">
						<div className="min-w-0 flex-1">
							<ActivityBalanceChart activities={activities} startOfDay={startedAt} />
						</div>
						<FocusPulse activities={activities} />
					</div>

					{/* App usage */}
					{appUsage.length > 0 && (
						<UsageSection
							title="App Usage"
							entries={appUsage}
							fallbackIcon={<AppWindowIcon size={20} className="text-base-400 shrink-0" />}
						/>
					)}

					{/* Website usage */}
					{websiteUsage.length > 0 && (
						<UsageSection
							title="Website Usage"
							entries={websiteUsage}
							fallbackIcon={<CodeIcon size={20} className="text-base-400 shrink-0" />}
						/>
					)}

					{/* Empty state */}
					{activities.length === 0 && (
						<div className="flex flex-col items-center justify-center py-12 text-center">
							<p className="text-base-500 text-sm">No activity tracked for this day</p>
							<p className="text-base-400 mt-1 text-xs">
								Start a focus session to see the selected day overview
							</p>
						</div>
					)}
				</div>
			</main>
		</>
	);
}

function LoadingComponent() {
	return (
		<div className="text-base-400 flex h-full items-center justify-center text-sm">
			Loading activity...
		</div>
	);
}
