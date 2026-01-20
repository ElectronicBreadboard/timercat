import React from 'react';
import { Tooltip, TooltipProvider } from '@/components';
import { specta } from '@/environment';
import { cn, formatDuration } from '@/lib';

export const SessionTimeline: React.FC<TSessionTimelineProps> = (props) => {
	const { session, activities, fallbackColor = '#9ca3af', className } = props;

	const [hoveredBlock, setHoveredBlock] = React.useState<number | null>(null);
	const [hoveredWindow, setHoveredWindow] = React.useState<number | null>(null);
	const [zoom, setZoom] = React.useState(1);
	const now = React.useMemo(() => Date.now(), []);
	const timelineRef = React.useRef<HTMLDivElement>(null);

	const sessionStartMs = session.startedAt;
	const sessionEndMs = session.endedAt ?? now;
	const sessionDurationMs = sessionEndMs - sessionStartMs;

	const activityBars = React.useMemo(() => {
		if (sessionDurationMs <= 0) return [];

		const sorted = [...activities].sort((a, b) => a.startedAt - b.startedAt);
		const minWidthPercent = 0.5;
		let lastBundleId: string | null = null;
		let blockIndex = 0;
		let visualEndPercent = 0; // Track where the last bar visually ends

		return sorted.map((activity, index) => {
			const bundleId = activity.appBundleId;
			const isFirstOfBlock = bundleId == null || bundleId !== lastBundleId;
			if (isFirstOfBlock) blockIndex++;
			lastBundleId = bundleId;

			const start = Math.max(activity.startedAt, sessionStartMs);
			const end = Math.min(activity.endedAt, sessionEndMs);

			const naturalLeft = ((start - sessionStartMs) / sessionDurationMs) * 100;
			const naturalWidth = ((end - start) / sessionDurationMs) * 100;

			// Push this bar's start to avoid overlapping with previous bar's visual end
			const adjustedLeft = Math.max(naturalLeft, visualEndPercent);
			const adjustedWidth = Math.max(naturalWidth - (adjustedLeft - naturalLeft), minWidthPercent);

			// Update visual end for next iteration
			visualEndPercent = adjustedLeft + adjustedWidth;

			return {
				activity,
				index,
				blockIndex,
				leftPercent: adjustedLeft,
				widthPercent: adjustedWidth,
				isFirstOfBlock
			};
		});
	}, [activities, sessionStartMs, sessionEndMs, sessionDurationMs]);

	// App blocks - one per contiguous app segment for stable app-level tooltips
	const appBlocks = React.useMemo(() => {
		if (activityBars.length === 0) return [];

		const blocks: {
			blockIndex: number;
			activity: specta.WindowActivityDto;
			leftPercent: number;
			widthPercent: number;
			duration: number;
		}[] = [];

		let current: (typeof blocks)[0] | null = null;

		for (const bar of activityBars) {
			const activityDuration = (bar.activity.endedAt - bar.activity.startedAt) / 1000;

			if (bar.isFirstOfBlock || current == null) {
				if (current != null) blocks.push(current);
				current = {
					blockIndex: bar.blockIndex,
					activity: bar.activity,
					leftPercent: bar.leftPercent,
					widthPercent: bar.widthPercent,
					duration: activityDuration
				};
			} else {
				current.widthPercent = bar.leftPercent + bar.widthPercent - current.leftPercent;
				current.duration += activityDuration;
			}
		}

		if (current != null) blocks.push(current);
		return blocks;
	}, [activityBars]);

	const pausePeriods = React.useMemo(() => {
		if (sessionDurationMs <= 0) return [];

		const periods: { leftPercent: number; widthPercent: number; duration: number }[] = [];
		let pauseStart: number | null = null;

		for (const event of session.events) {
			if (event.eventType === 'paused') {
				pauseStart = event.timestamp;
			} else if (event.eventType === 'resumed' && pauseStart != null) {
				const start = Math.max(pauseStart, sessionStartMs);
				const end = Math.min(event.timestamp, sessionEndMs);
				periods.push({
					leftPercent: ((start - sessionStartMs) / sessionDurationMs) * 100,
					widthPercent: ((end - start) / sessionDurationMs) * 100,
					duration: (end - start) / 1000
				});
				pauseStart = null;
			}
		}

		// Handle ongoing pause
		if (pauseStart != null) {
			const start = Math.max(pauseStart, sessionStartMs);
			periods.push({
				leftPercent: ((start - sessionStartMs) / sessionDurationMs) * 100,
				widthPercent: ((sessionEndMs - start) / sessionDurationMs) * 100,
				duration: (sessionEndMs - start) / 1000
			});
		}

		return periods;
	}, [session.events, sessionStartMs, sessionEndMs, sessionDurationMs]);

	const appLegend = React.useMemo(() => {
		const groups = new Map<string, { totalSeconds: number; color: string | null }>();

		for (const activity of activities) {
			const appName = activity.appName ?? 'Unknown';
			const duration = (activity.endedAt - activity.startedAt) / 1000;
			const existing = groups.get(appName);

			if (existing != null) {
				existing.totalSeconds += duration;
				if (existing.color == null && activity.appColor != null) {
					existing.color = activity.appColor;
				}
			} else {
				groups.set(appName, { totalSeconds: duration, color: activity.appColor });
			}
		}

		return Array.from(groups.entries())
			.sort((a, b) => b[1].totalSeconds - a[1].totalSeconds)
			.slice(0, 8);
	}, [activities]);

	// MARK: - Effects

	React.useEffect(() => {
		const el = timelineRef.current;
		if (el == null) return;

		const handleWheel = (e: WheelEvent) => {
			e.preventDefault();
			if (e.ctrlKey || e.metaKey) {
				const delta = e.deltaY > 0 ? -0.2 : 0.2;
				setZoom((z) => Math.max(1, Math.min(10, z + delta)));
			} else {
				el.scrollLeft += e.deltaY;
			}
		};

		el.addEventListener('wheel', handleWheel, { passive: false });
		return () => el.removeEventListener('wheel', handleWheel);
	}, []);

	// MARK: - UI

	if (activities.length === 0) {
		return <div className="text-base-400 text-sm">No activity recorded for this session</div>;
	}

	return (
		<div className={cn('flex flex-col gap-4', className)}>
			{/* Timeline */}
			<div className="flex flex-col gap-2">
				<div className="text-base-500 flex items-center justify-between text-xs font-medium">
					<span>Activity Timeline</span>
					{zoom > 1 && <span className="text-base-400 font-normal">{Math.round(zoom * 100)}%</span>}
				</div>
				<TooltipProvider delay={200} closeDelay={100}>
					<div
						ref={timelineRef}
						className={cn('rounded', zoom > 1 ? 'overflow-x-auto' : 'overflow-hidden')}
					>
						<div className="bg-base-100 relative h-8" style={{ width: `${zoom * 100}%` }}>
							{/* Layer 1: Colored bars with app borders and split lines */}
							{activityBars.map(
								({ activity, index, blockIndex, leftPercent, widthPercent, isFirstOfBlock }) => (
									<div
										key={`bar-${index}`}
										className={cn(
											'absolute top-0 h-full',
											isFirstOfBlock && 'border-base-900/40 border-l'
										)}
										style={{
											left: `${leftPercent}%`,
											width: `${widthPercent}%`,
											backgroundColor: activity.appColor ?? fallbackColor
										}}
									>
										{hoveredBlock === blockIndex && (
											<div className="bg-base-900/20 pointer-events-none absolute top-1/2 left-0 h-px w-full" />
										)}
									</div>
								)
							)}

							{/* Layer 2: App zone (top half) - one overlay per block for stable tooltips */}
							{appBlocks.map((block) => (
								<Tooltip
									key={`app-${block.blockIndex}`}
									content={
										<AppTooltipContent activity={block.activity} duration={block.duration} />
									}
									side="top"
								>
									<div
										className="absolute top-0 h-1/2"
										style={{
											left: `${block.leftPercent}%`,
											width: `${Math.max(block.widthPercent, 0.5)}%`
										}}
										onMouseEnter={() => setHoveredBlock(block.blockIndex)}
										onMouseLeave={() => setHoveredBlock(null)}
									/>
								</Tooltip>
							))}

							{/* Layer 3: Window zone (bottom half) - one overlay per window */}
							{activityBars.map(({ activity, index, blockIndex, leftPercent, widthPercent }) => (
								<Tooltip
									key={`window-${index}`}
									content={<WindowTooltipContent activity={activity} />}
									side="bottom"
								>
									<div
										className={cn(
											'absolute bottom-0 h-1/2',
											hoveredWindow === index && 'bg-base-900/10'
										)}
										style={{
											left: `${leftPercent}%`,
											width: `${widthPercent}%`
										}}
										onMouseEnter={() => {
											setHoveredBlock(blockIndex);
											setHoveredWindow(index);
										}}
										onMouseLeave={() => {
											setHoveredBlock(null);
											setHoveredWindow(null);
										}}
									>
										{hoveredBlock === blockIndex && (
											<div className="border-base-900/30 absolute inset-0 border-l" />
										)}
									</div>
								</Tooltip>
							))}

							{/* Layer 4: Pause period overlays */}
							{pausePeriods.map((pause, index) => (
								<Tooltip
									key={`pause-${index}`}
									content={<PauseTooltipContent duration={pause.duration} />}
									side="top"
								>
									<div
										className="absolute top-0 h-full"
										style={{
											left: `${pause.leftPercent}%`,
											width: `${Math.max(pause.widthPercent, 0.5)}%`,
											background:
												'repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(0,0,0,0.15) 3px, rgba(0,0,0,0.15) 6px)'
										}}
									/>
								</Tooltip>
							))}
						</div>
					</div>
				</TooltipProvider>
			</div>

			{/* Legend */}
			{appLegend.length > 0 && (
				<div className="flex flex-col gap-2">
					<div className="text-base-500 text-xs font-medium">Apps</div>
					<div className="flex flex-wrap gap-2">
						{appLegend.map(([appName, { totalSeconds, color }]) => (
							<div key={appName} className="flex items-center gap-1.5">
								<div
									className="size-2.5 rounded-sm"
									style={{ backgroundColor: color ?? fallbackColor }}
								/>
								<span className="text-base-600 text-xs">{appName}</span>
								<span className="text-base-400 text-xs">({Math.round(totalSeconds / 60)}m)</span>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
};

interface TSessionTimelineProps {
	session: specta.SessionDetailDto;
	activities: specta.WindowActivityDto[];
	fallbackColor?: string;
	className?: string;
}

const AppTooltipContent: React.FC<TAppTooltipContentProps> = (props) => {
	const { activity, duration } = props;

	return (
		<div className="flex max-w-xs items-center gap-2.5">
			{activity.appIcon != null && (
				<img src={activity.appIcon} alt="" className="size-8 shrink-0 rounded" />
			)}
			<div className="flex min-w-0 flex-col gap-0.5">
				<span className="truncate text-sm font-medium">{activity.appName ?? 'Unknown'}</span>
				<span className="text-base-500 text-xs">{formatDuration(duration)}</span>
			</div>
		</div>
	);
};

interface TAppTooltipContentProps {
	activity: specta.WindowActivityDto;
	duration: number;
}

const WindowTooltipContent: React.FC<TWindowTooltipContentProps> = (props) => {
	const { activity } = props;
	const duration = (activity.endedAt - activity.startedAt) / 1000;

	return (
		<div className="flex max-w-xs items-center gap-2.5">
			{activity.appIcon != null && (
				<img src={activity.appIcon} alt="" className="size-8 shrink-0 rounded" />
			)}
			<div className="flex min-w-0 flex-col gap-0.5">
				<span className="truncate text-sm font-medium">{activity.appName ?? 'Unknown'}</span>
				{activity.windowTitle != null && (
					<span className="text-base-400 truncate text-xs">{activity.windowTitle}</span>
				)}
				<span className="text-base-500 text-xs">{formatDuration(duration)}</span>
			</div>
		</div>
	);
};

interface TWindowTooltipContentProps {
	activity: specta.WindowActivityDto;
}

const PauseTooltipContent: React.FC<TPauseTooltipContentProps> = (props) => {
	const { duration } = props;

	return (
		<div className="flex items-center gap-1.5">
			<span className="text-sm font-medium">Paused</span>
			<span className="text-base-500 text-xs">{formatDuration(duration)}</span>
		</div>
	);
};

interface TPauseTooltipContentProps {
	duration: number;
}
