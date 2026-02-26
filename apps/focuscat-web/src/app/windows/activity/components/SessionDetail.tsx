import {
	ArrowLeftIcon,
	BriefcaseIcon,
	cn,
	CoffeeIcon,
	formatDuration,
	formatTimeOfDayAmPm
} from '@repo/ui';
import React from 'react';
import type { TSessionRow } from '@/features/session';

export const SessionDetail: React.FC<TSessionDetailProps> = (props) => {
	const { session, onBack } = props;

	const sessionInfo = React.useMemo(() => {
		const isWork = session.session_type.endsWith(':work');
		const duration = session.actual_seconds ?? session.planned_seconds;

		const startDate = new Date(session.started_at);
		const endDate = session.ended_at != null ? new Date(session.ended_at) : null;

		const dateStr = startDate.toLocaleDateString('en-US', {
			weekday: 'long',
			month: 'short',
			day: 'numeric'
		});

		const startTime = formatTimeOfDayAmPm(startDate);
		const endTime = endDate != null ? formatTimeOfDayAmPm(endDate) : null;
		const timeRange = endTime != null ? `${startTime} - ${endTime}` : `${startTime} - ongoing`;

		const intention = session.intention?.trim() ?? '';

		return {
			isWork,
			name: isWork ? (intention !== '' ? intention : 'Focus') : 'Break',
			duration,
			dateStr,
			timeRange,
			status: session.status,
			progress:
				session.status === 'cancelled' &&
				session.actual_seconds != null &&
				session.planned_seconds > 0
					? Math.min(100, Math.round((session.actual_seconds / session.planned_seconds) * 100))
					: null,
			showPlanned:
				session.status === 'active' ||
				session.actual_seconds == null ||
				session.actual_seconds !== session.planned_seconds
		};
	}, [session]);

	// MARK: - UI

	return (
		<div className="flex flex-col gap-5">
			{/* Back button */}
			{onBack != null && (
				<button
					type="button"
					onClick={onBack}
					className="text-base-500 hover:text-base-700 -ml-0.5 flex items-center gap-1.5 text-sm transition-colors"
				>
					<ArrowLeftIcon size={14} />
					<span>Back</span>
				</button>
			)}

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
			</div>

			{/* Stats card */}
			<div className="border-base-100 bg-base-50 divide-base-100 divide-y overflow-hidden rounded-lg border">
				<StatRow label="Date" value={sessionInfo.dateStr} />
				<StatRow label="Time" value={sessionInfo.timeRange} />
				<StatRow
					label="Duration"
					value={
						sessionInfo.status === 'active' ? 'In progress' : formatDuration(sessionInfo.duration)
					}
				/>
				{sessionInfo.showPlanned && (
					<StatRow label="Planned" value={formatDuration(session.planned_seconds)} />
				)}
				{sessionInfo.progress != null && (
					<div className="flex items-center justify-between px-3 py-2.5">
						<span className="text-base-500 text-xs">Progress</span>
						<div className="flex items-center gap-2">
							<span className="text-base-500 w-7 text-right text-xs tabular-nums">
								{sessionInfo.progress}%
							</span>
							<div className="bg-base-200 h-1.5 w-20 overflow-hidden rounded-full">
								<div
									className="bg-base-400 h-full rounded-full"
									style={{ width: `${sessionInfo.progress}%` }}
								/>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

interface TSessionDetailProps {
	session: TSessionRow;
	onBack?: () => void;
}

// MARK: - Stat Row

const StatRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
	<div className="flex items-center justify-between px-3 py-2.5">
		<span className="text-base-500 text-xs">{label}</span>
		<span className="text-base-700 text-sm">{value}</span>
	</div>
);
