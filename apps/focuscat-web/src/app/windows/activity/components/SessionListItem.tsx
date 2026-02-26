import { BriefcaseIcon, cn, CoffeeIcon, formatDuration, formatTimeOfDayAmPm } from '@repo/ui';
import React from 'react';
import type { TSessionRow } from '@/features/session';

export const SessionListItem: React.FC<TSessionListItemProps> = (props) => {
	const { session, isSelected, onSelect } = props;

	const isWork = session.session_type.endsWith(':work');
	const intention = session.intention?.trim() ?? '';
	const sessionName = isWork ? (intention !== '' ? intention : 'Focus') : 'Break';
	const duration = session.actual_seconds ?? session.planned_seconds;

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
		const start = new Date(session.started_at);
		if (session.ended_at == null) {
			return formatTimeOfDayAmPm(start);
		}
		const end = new Date(session.ended_at);
		return `${formatTimeOfDayAmPm(start)} - ${formatTimeOfDayAmPm(end)}`;
	}, [session.started_at, session.ended_at]);

	return (
		<button
			type="button"
			className={cn(
				'flex w-full flex-col gap-1.5 px-3 py-2.5 text-left transition-colors',
				isSelected ? 'bg-base-100' : 'hover:bg-base-100/50'
			)}
			onClick={() => onSelect(session)}
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
		</button>
	);
};

interface TSessionListItemProps {
	session: TSessionRow;
	isSelected: boolean;
	onSelect: (session: TSessionRow) => void;
}
