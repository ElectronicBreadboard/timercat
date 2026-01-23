import { useFeatureState } from 'feature-react/state';
import React from 'react';
import { Slider, Timeline, TimelineAxis, TooltipProvider } from '@/components';
import type { specta } from '@/environment';
import { useMemoCleanup } from '@/hooks';
import { cn } from '@/lib';
import { ActivityRow } from './ActivityRow';
import { SessionEventMarkers, SessionEventPeriodOverlays } from './SessionEventIndicators';
import { SessionTimelineCx } from './SessionTimelineCx';

export const SessionTimeline: React.FC<TSessionTimelineProps> = (props) => {
	const { session, activities, className } = props;

	const cx = useMemoCleanup(() => {
		const instance = new SessionTimelineCx(session, activities);
		return [instance, () => instance.unmount()];
	}, [session, activities]);

	const granularity = useFeatureState(cx.$granularity);

	// MARK: - UI

	if (activities.length === 0) {
		return <div className="text-base-400 text-sm">No activity recorded</div>;
	}

	return (
		<div className={cn('flex flex-col gap-2', className)}>
			{/* Header */}
			<div className="text-base-500 px-2 text-xs font-medium">Activity Timeline</div>

			{/* Timeline */}
			<Timeline cx={cx.timelineCx}>
				<TooltipProvider delay={200} closeDelay={100}>
					<div className="relative">
						<TimelineAxis cx={cx.timelineCx} />
						<ActivityRow cx={cx.activityRowCx} />

						{/* Event markers at top of axis with dashed line through */}
						<div className="pointer-events-none absolute inset-0">
							<SessionEventMarkers cx={cx} />
						</div>

						{/* Event period overlays (pause, overtime, cancelled) on activity row */}
						<div className="pointer-events-none absolute inset-x-0 top-6 bottom-0">
							<SessionEventPeriodOverlays cx={cx} />
						</div>
					</div>
				</TooltipProvider>
			</Timeline>

			{/* Footer */}
			<div className="flex items-center justify-between">
				<span className="text-base-400 text-xs leading-none">
					Cmd+scroll to zoom · scroll to pan
				</span>
				<Slider
					value={granularity}
					onValueChange={(v) => cx.setGranularity(v)}
					min={cx.config.granularityMin}
					max={cx.config.granularityMax}
					step={1}
					size="sm"
					className="w-16 py-0"
					aria-label="Timeline detail"
				/>
			</div>
		</div>
	);
};

export interface TSessionTimelineProps {
	session: specta.SessionDetailDto;
	activities: specta.WindowActivityDto[];
	className?: string;
}
