import { ClockIcon, cn } from '@repo/ui';
import { Link, useParams } from '@tanstack/react-router';
import React from 'react';
import { specta } from '@/environment';
import { SessionListItem } from './SessionListItem';

export const SessionList: React.FC<TSessionListProps> = (props) => {
	const { sessions, className } = props;
	const params = useParams({ strict: false });

	const isOverviewSelected = params.sessionId == null;

	// Group sessions by date
	const groupedSessions = React.useMemo(() => {
		const groups = new Map<string, specta.SessionSummaryDto[]>();
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const yesterday = new Date(today);
		yesterday.setDate(yesterday.getDate() - 1);

		for (const session of sessions) {
			const date = new Date(session.startedAt);
			const dateOnly = new Date(date);
			dateOnly.setHours(0, 0, 0, 0);

			let dateKey: string;
			if (dateOnly.getTime() === today.getTime()) {
				dateKey = 'Today';
			} else if (dateOnly.getTime() === yesterday.getTime()) {
				dateKey = 'Yesterday';
			} else {
				dateKey = date.toLocaleDateString('en-US', {
					weekday: 'short',
					month: 'short',
					day: 'numeric'
				});
			}

			const existing = groups.get(dateKey) ?? [];
			groups.set(dateKey, [...existing, session]);
		}

		return groups;
	}, [sessions]);

	return (
		<div className={cn('bg-base-0 flex flex-col overflow-y-auto', className)}>
			{/* Overview Entry */}
			<Link
				to="/window/activity/overview"
				className={cn(
					'border-base-200 flex items-center gap-2 border-b px-3 py-2.5 transition-colors',
					isOverviewSelected ? 'bg-base-100' : 'hover:bg-base-100/50'
				)}
			>
				<ClockIcon size={14} className="text-base-500 shrink-0" />
				<span className={cn('text-base-700 text-sm', isOverviewSelected && 'font-medium')}>
					Overview
				</span>
			</Link>

			{Array.from(groupedSessions.entries()).map(([dateKey, dateSessions], index) => (
				<div key={dateKey}>
					{/* Date Header */}
					<div
						className={cn(
							'bg-base-50 border-base-200 sticky top-0 z-10 border-b px-3 py-2',
							index > 0 && 'border-t'
						)}
					>
						<span className="text-base-500 text-xs font-medium tracking-wide uppercase">
							{dateKey}
						</span>
					</div>

					{/* Sessions */}
					<div className="border-base-200 divide-base-200 flex flex-col divide-y border-b">
						{dateSessions.map((session) => (
							<SessionListItem key={session.id} session={session} />
						))}
					</div>
				</div>
			))}
		</div>
	);
};

interface TSessionListProps {
	sessions: specta.SessionSummaryDto[];
	className?: string;
}
