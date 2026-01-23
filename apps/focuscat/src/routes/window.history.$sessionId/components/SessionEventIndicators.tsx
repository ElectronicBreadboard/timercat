import { useFeatureState } from 'feature-react/state';
import React from 'react';
import { Tooltip } from '@/components';
import { formatDuration } from '@/lib';
import type { SessionTimelineCx, TTimePeriod } from './SessionTimelineCx';

// MARK: - Overlay

export const SessionEventPauseOverlays: React.FC<TSessionOverlaysProps> = (props) => {
	const { cx } = props;
	useFeatureState(cx.timelineCx.$zoom);
	useFeatureState(cx.timelineCx.$containerRect);

	return (
		<>
			{cx.pausePeriods.map((period, index) => (
				<PeriodOverlay key={`pause-${index}`} period={period} cx={cx} className="bg-amber-500/20" />
			))}
		</>
	);
};

export const SessionStatusOverlays: React.FC<TSessionOverlaysProps> = (props) => {
	const { cx } = props;
	useFeatureState(cx.timelineCx.$zoom);
	useFeatureState(cx.timelineCx.$containerRect);

	return (
		<>
			{cx.cancelledPeriod != null && (
				<PeriodOverlay period={cx.cancelledPeriod} cx={cx} className="bg-base-400/30" />
			)}
			{cx.overtimePeriods.map((period, index) => (
				<PeriodOverlay
					key={`overtime-${index}`}
					period={period}
					cx={cx}
					className="bg-red-500/20"
				/>
			))}
		</>
	);
};

export interface TSessionOverlaysProps {
	cx: SessionTimelineCx;
}

const PeriodOverlay: React.FC<TPeriodOverlayProps> = (props) => {
	const { period, cx, className } = props;
	const left = cx.timelineCx.msToPx(period.startMs);
	const width = cx.timelineCx.msToPx(period.endMs) - left;

	return (
		<div
			className={`pointer-events-none absolute top-0 h-full ${className}`}
			style={{ left, width: Math.max(width, 2) }}
		/>
	);
};

interface TPeriodOverlayProps {
	period: TTimePeriod;
	cx: SessionTimelineCx;
	className: string;
}

// MARK: - Event Markers

export const SessionEventMarkers: React.FC<TSessionMarkersProps> = (props) => {
	const { cx } = props;
	useFeatureState(cx.timelineCx.$zoom);
	useFeatureState(cx.timelineCx.$containerRect);

	return (
		<>
			{cx.eventMarkers.map((marker, index) => {
				const left = cx.timelineCx.msToPx(marker.timestamp);
				const time = new Date(marker.timestamp).toLocaleTimeString('en-US', {
					hour: 'numeric',
					minute: '2-digit'
				});

				switch (marker.eventType) {
					case 'paused':
						return (
							<EventMarker
								key={`marker-${index}`}
								left={left}
								color="#f59e0b"
								label="Paused"
								time={time}
							/>
						);
					case 'resumed':
						return (
							<EventMarker
								key={`marker-${index}`}
								left={left}
								color="#22c55e"
								label="Resumed"
								time={time}
							/>
						);
					case 'extended':
						return (
							<EventMarker
								key={`marker-${index}`}
								left={left}
								color="#3b82f6"
								label="Extended"
								time={time}
								subtitle={marker.data?.seconds != null ? `+${formatDuration(marker.data.seconds)}` : undefined}
							/>
						);
					case 'cancelled':
						return (
							<EventMarker
								key={`marker-${index}`}
								left={left}
								color="#9ca3af"
								label="Cancelled"
								time={time}
							/>
						);
					case 'overtime':
						return (
							<EventMarker
								key={`marker-${index}`}
								left={left}
								color="#ef4444"
								label="Overtime"
								time={time}
								subtitle={marker.data?.seconds != null ? formatDuration(marker.data.seconds) : undefined}
							/>
						);
				}
			})}
		</>
	);
};

export interface TSessionMarkersProps {
	cx: SessionTimelineCx;
}

const EventMarker: React.FC<TEventMarkerProps> = (props) => {
	const { left, color, label, time, subtitle } = props;

	return (
		<Tooltip
			content={
				<div className="flex flex-col gap-0.5">
					<span className="text-sm font-medium">{label}</span>
					<span className="text-base-500 text-xs">{time}</span>
					{subtitle != null && <span className="text-base-400 text-xs">{subtitle}</span>}
				</div>
			}
			side="top"
		>
			<div
				className="pointer-events-auto absolute top-0 bottom-0 flex flex-col items-center"
				style={{ left, transform: 'translateX(-50%)' }}
			>
				{/* Pin marker: rectangle + triangle */}
				<div className="h-1.5 w-2" style={{ backgroundColor: color }} />
				<div
					className="size-0 border-x-4 border-t-[3px] border-x-transparent"
					style={{ borderTopColor: color }}
				/>
				{/* Dashed vertical line */}
				<div className="flex-1 border-l border-dashed" style={{ borderColor: color }} />
			</div>
		</Tooltip>
	);
};

interface TEventMarkerProps {
	left: number;
	color: string;
	label: string;
	time: string;
	subtitle?: string;
}
