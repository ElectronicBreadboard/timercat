import React from 'react';
import { Timeline, TimelineAxis } from '@/components';
import { specta } from '@/environment';
import { cn } from '@/lib';
import { ActivityTimelineRow } from './ActivityTimeline';

export const SessionTimelineV2: React.FC<TSessionTimelineV2Props> = (props) => {
	const { session, activities, className } = props;

	const now = React.useMemo(() => Date.now(), []);
	const sessionStartMs = session.startedAt;
	const sessionEndMs = session.endedAt ?? now;

	if (activities.length === 0) {
		return <div className="text-base-400 text-sm">No activity recorded</div>;
	}

	return (
		<div className={cn('flex flex-col gap-2', className)}>
			{/* Header */}
			<div className="text-base-500 text-xs font-medium">Activity Timeline</div>

			{/* Timeline */}
			<Timeline startMs={sessionStartMs} endMs={sessionEndMs}>
				<TimelineAxis />
				<ActivityTimelineRow activities={activities} />
			</Timeline>

			{/* Instructions */}
			<p className="text-base-400 text-xs">Cmd+scroll to zoom · scroll to pan</p>
		</div>
	);
};

export interface TSessionTimelineV2Props {
	session: specta.SessionDetailDto;
	activities: specta.WindowActivityDto[];
	className?: string;
}
