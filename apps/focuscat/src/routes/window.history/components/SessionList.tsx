import { Link, useParams } from '@tanstack/react-router';
import { useCompute } from 'feature-react/state';
import React from 'react';
import { BugIcon } from '@/components';
import { specta } from '@/environment';
import { useSettingsCx } from '@/features/settings';
import { cn } from '@/lib';
import { SessionListItem } from './SessionListItem';

export const SessionList: React.FC<TSessionListProps> = (props) => {
	const { sessions, className } = props;
	const params = useParams({ strict: false });
	const settingsCx = useSettingsCx();

	const debugEnabled = useCompute(
		settingsCx.$appSettings,
		({ value: settings }) => settings.features.debug
	);
	const isDebugSelected = params.sessionId === 'debug';

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
			{/* Debug Entry */}
			{debugEnabled && (
				<Link
					to="/window/history/$sessionId"
					params={{ sessionId: 'debug' }}
					className={cn(
						'border-base-200 flex items-center gap-2 border-b px-3 py-2.5 transition-colors',
						isDebugSelected ? 'bg-base-100' : 'hover:bg-base-100/50'
					)}
				>
					<BugIcon size={14} className="shrink-0 text-amber-600" />
					<span className={cn('text-sm text-amber-600', isDebugSelected && 'font-medium')}>
						Debug: Last 4h
					</span>
				</Link>
			)}

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
					<div className="divide-base-200 flex flex-col divide-y">
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
