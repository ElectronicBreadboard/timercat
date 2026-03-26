import { cn } from '@repo/ui';
import React from 'react';
import type { TSessionRow } from '@/features/session';
import { SessionListItem } from './SessionListItem';

export const SessionList: React.FC<TSessionListProps> = (props) => {
	const { sessions, selectedId, onSelect, className } = props;

	// Group sessions by date
	const groupedSessions = React.useMemo(() => {
		const groups = new Map<string, TSessionRow[]>();
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const yesterday = new Date(today);
		yesterday.setDate(yesterday.getDate() - 1);

		for (const session of sessions) {
			const date = new Date(session.started_at);
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
							<SessionListItem
								key={session.id}
								session={session}
								isSelected={session.id === selectedId}
								onSelect={onSelect}
							/>
						))}
					</div>
				</div>
			))}
		</div>
	);
};

interface TSessionListProps {
	sessions: TSessionRow[];
	selectedId: number | null;
	onSelect: (session: TSessionRow) => void;
	className?: string;
}
