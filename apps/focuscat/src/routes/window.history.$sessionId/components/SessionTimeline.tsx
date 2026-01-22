import React from 'react';
import { Timeline, TimelineAxis } from '@/components';
import { specta } from '@/environment';
import { cn } from '@/lib';

import { ActivityRow } from './ActivityTimeline';

export const SessionTimeline: React.FC<TSessionTimelineProps> = (props) => {
	const { session, activities, className } = props;

	const now = React.useMemo(() => Date.now(), []);
	const sessionStartMs = session.startedAt;
	const sessionEndMs = session.endedAt ?? now;

	if (activities.length === 0) {
		return <div className="text-base-400 text-sm">No activity recorded</div>;
	}

	return (
		<div className={cn('flex flex-col gap-2', className)}>
			<div className="text-base-500 text-xs font-medium">Activity Timeline</div>

			<Timeline startMs={sessionStartMs} endMs={sessionEndMs}>
				<TimelineAxis />
				<ActivityRow activities={activities} />
			</Timeline>

			<p className="text-base-400 text-xs">Cmd+scroll to zoom · scroll to pan</p>
		</div>
	);
};

export interface TSessionTimelineProps {
	session: specta.SessionDetailDto;
	activities: specta.WindowActivityDto[];
	className?: string;
}
