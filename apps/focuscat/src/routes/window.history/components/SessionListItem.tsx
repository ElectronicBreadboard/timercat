import { Link, useParams } from '@tanstack/react-router';
import React from 'react';
import { BriefcaseIcon, CoffeeIcon } from '@/components';
import { specta } from '@/environment';
import { cn, formatDuration, formatTimeOfDayAmPm } from '@/lib';

export const SessionListItem: React.FC<TSessionListItemProps> = (props) => {
	const { session } = props;
	const params = useParams({ strict: false });
	const isSelected = params.sessionId === String(session.id);

	const isWork = session.phase === 'work';
	const sessionName = isWork ? 'Focus Session' : 'Break';
	const duration = session.actualSeconds ?? session.plannedSeconds;

	const iconColor = React.useMemo(() => {
		switch (session.status) {
			case 'active':
				return 'text-blue-500';
			case 'completed':
				return 'text-green-500';
			case 'cancelled':
				return 'text-base-400';
		}
	}, [session.status]);

	const timeRange = React.useMemo(() => {
		const start = new Date(session.startedAt);
		if (session.endedAt == null) {
			return formatTimeOfDayAmPm(start);
		}
		const end = new Date(session.endedAt);
		return `${formatTimeOfDayAmPm(start)} - ${formatTimeOfDayAmPm(end)}`;
	}, [session.startedAt, session.endedAt]);

	return (
		<Link
			to="/window/history/$sessionId"
			params={{ sessionId: String(session.id) }}
			className={cn(
				'flex w-full flex-col gap-1.5 px-3 py-2.5 text-left transition-colors',
				isSelected ? 'bg-base-100' : 'hover:bg-base-100/50'
			)}
		>
			{/* Header: Icon + Name + Duration */}
			<div className="flex items-center gap-2">
				{isWork ? (
					<BriefcaseIcon size={14} className={cn(iconColor, 'shrink-0')} />
				) : (
					<CoffeeIcon size={14} className={cn(iconColor, 'shrink-0')} />
				)}
				<span className={cn('text-base-800 flex-1 truncate text-sm', isSelected && 'font-medium')}>
					{sessionName}
				</span>
				<span className="text-base-500 shrink-0 text-xs tabular-nums">
					{formatDuration(duration)}
				</span>
			</div>

			{/* Time Range */}
			<div className="text-base-400 pl-[22px] text-[11px]">{timeRange}</div>
		</Link>
	);
};

interface TSessionListItemProps {
	session: specta.SessionSummaryDto;
}
