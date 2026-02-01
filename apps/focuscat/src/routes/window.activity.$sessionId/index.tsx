import { createFileRoute } from '@tanstack/react-router';
import { useFeatureState } from 'feature-react/state';
import React from 'react';
import { unwrapOr } from 'tuple-result';
import { BriefcaseIcon, CoffeeIcon } from '@/components';
import { specta } from '@/environment';
import { useSettingsCx } from '@/features/settings';
import { cn, formatDuration, formatTimeOfDayAmPm, toTuple } from '@/lib';
import { SessionTimeline } from './components';

export const Route = createFileRoute('/window/activity/$sessionId/')({
	loader: async ({ params }) => {
		const sessionId = Number(params.sessionId);

		// Load session detail
		const [isSessionOk, , session] = toTuple(await specta.commands.getSession(sessionId));
		if (!isSessionOk || session == null) {
			return null;
		}

		// Load activities that overlap with the session time range
		const sessionStart = session.startedAt;
		const sessionEnd = session.endedAt ?? Date.now();

		const activities = unwrapOr(
			toTuple(
				await specta.commands.getWindowActivities({
					startedAfter: sessionStart,
					startedBefore: sessionEnd,
					limit: null
				})
			),
			[]
		);

		return { session, activities };
	},
	pendingComponent: LoadingComponent,
	component: RouteComponent
});

function RouteComponent() {
	const data = Route.useLoaderData();
	const settingsCx = useSettingsCx();
	const settings = useFeatureState(settingsCx.$appSettings);

	const sessionInfo = React.useMemo(() => {
		if (data == null) {
			return null;
		}

		const { session } = data;
		const isWork = session.phase === 'work';
		const duration = session.actualSeconds ?? session.plannedSeconds;

		const startDate = new Date(session.startedAt);
		const endDate = session.endedAt != null ? new Date(session.endedAt) : null;

		const dateStr = startDate.toLocaleDateString('en-US', {
			weekday: 'long',
			month: 'short',
			day: 'numeric'
		});

		const timeRange =
			endDate != null
				? `${formatTimeOfDayAmPm(startDate)} - ${formatTimeOfDayAmPm(endDate)}`
				: `${formatTimeOfDayAmPm(startDate)} - ongoing`;

		return {
			isWork,
			name: isWork ? 'Focus Session' : 'Break',
			duration,
			dateStr,
			timeRange,
			status: session.status
		};
	}, [data]);

	if (data == null || sessionInfo == null) {
		return (
			<div className="text-base-400 flex h-full items-center justify-center text-sm">
				Session not found
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-6">
			{/* Session Header */}
			<div className="flex flex-col gap-1">
				<div className="flex items-center gap-2">
					{sessionInfo.isWork ? (
						<BriefcaseIcon size={18} className="text-base-600" />
					) : (
						<CoffeeIcon size={18} className="text-base-600" />
					)}
					<h2 className="text-base-900 text-lg font-medium">{sessionInfo.name}</h2>
					<span
						className={cn('rounded px-1.5 py-0.5 text-xs', {
							'bg-green-100 text-green-700': sessionInfo.status === 'completed',
							'bg-blue-100 text-blue-700': sessionInfo.status === 'active',
							'bg-base-100 text-base-500': sessionInfo.status === 'cancelled'
						})}
					>
						{sessionInfo.status}
					</span>
				</div>
				<div className="text-base-500 flex items-center gap-2 text-sm">
					<span>{sessionInfo.dateStr}</span>
					<span>·</span>
					<span>{sessionInfo.timeRange}</span>
					<span>·</span>
					<span className="font-medium">{formatDuration(sessionInfo.duration)}</span>
				</div>
			</div>

			{/* New Timeline */}
			<SessionTimeline session={data.session} activities={data.activities} />

			{/* Debug JSON */}
			{settings.features.debug && (
				<div className="border-base-200 mt-4 border-t pt-4">
					<div className="text-base-500 mb-2 text-xs font-medium">Debug Data</div>
					<pre className="bg-base-50 text-base-600 rounded p-3 text-xs break-all whitespace-pre-wrap">
						{JSON.stringify(
							data,
							(key, value) => {
								if (key === 'appIcon' && typeof value === 'string' && value.length > 50) {
									return `${value.slice(0, 50)}... (${value.length} chars)`;
								}
								return value;
							},
							2
						)}
					</pre>
				</div>
			)}
		</div>
	);
}

function LoadingComponent() {
	return (
		<div className="text-base-400 flex h-full items-center justify-center text-sm">
			Loading session...
		</div>
	);
}
