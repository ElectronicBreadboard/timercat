import { formatDuration, Tooltip, TooltipProvider } from '@repo/ui';
import React from 'react';
import type { specta } from '@/environment';
import { categoryToColor, FocusCategoryTooltip, type FocusViewCategory } from '@/features/focus';

export const ActivityBalanceChart: React.FC<TActivityBalanceChartProps> = (props) => {
	const { activities, startOfDay, halfH = 80, minBarPx = 2 } = props;

	const [isChartHovered, setIsChartHovered] = React.useState(false);
	const hourAxisLabels = React.useMemo<Partial<Record<number, string>>>(
		() => ({
			0: '12AM',
			6: '6AM',
			12: '12PM',
			18: '6PM'
		}),
		[]
	);
	const bins = React.useMemo(() => computeBins(activities, startOfDay), [activities, startOfDay]);

	const maxPositive = React.useMemo(
		() => Math.max(1, ...bins.map((b) => b.focused + b.neutral + b.uncategorized)),
		[bins]
	);
	const maxNegative = React.useMemo(() => Math.max(1, ...bins.map((b) => b.distracting)), [bins]);

	const positiveTicks = React.useMemo(() => computeTicks(maxPositive), [maxPositive]);
	const negativeTicks = React.useMemo(() => computeTicks(maxNegative), [maxNegative]);

	// MARK: - UI

	return (
		<TooltipProvider delay={300} closeDelay={50}>
			<div className="flex flex-col gap-1">
				{/* Bars area */}
				<div
					className="relative px-2"
					onMouseEnter={() => setIsChartHovered(true)}
					onMouseLeave={() => setIsChartHovered(false)}
				>
					{/* Grid lines (chart hover only) */}
					{isChartHovered && (
						<div
							className="pointer-events-none absolute inset-x-2 top-0"
							style={{ height: halfH * 2 }}
						>
							{positiveTicks.map((t) => {
								const y = halfH - (t / maxPositive) * halfH;
								return (
									<div
										key={`p${t}`}
										className="absolute inset-x-0 flex items-center gap-1"
										style={{ top: y }}
									>
										<span className="text-base-400 text-[10px] leading-none whitespace-nowrap">
											{formatDuration(t / 1000)}
										</span>
										<div className="border-base-200 flex-1 border-t border-dashed" />
									</div>
								);
							})}
							{negativeTicks.map((t) => {
								const y = halfH + (t / maxNegative) * halfH;
								return (
									<div
										key={`n${t}`}
										className="absolute inset-x-0 flex items-center gap-1"
										style={{ top: y }}
									>
										<span className="text-base-400 text-[10px] leading-none whitespace-nowrap">
											{formatDuration(t / 1000)}
										</span>
										<div className="border-base-200 flex-1 border-t border-dashed" />
									</div>
								);
							})}
						</div>
					)}

					{/* Bars + axis */}
					<div className="relative flex gap-px" style={{ height: halfH * 2 }}>
						{bins.map((bin, h) => {
							const tooltipSide = h < 12 ? 'right' : 'left';
							const focusedH =
								bin.focused > 0 ? Math.max((bin.focused / maxPositive) * halfH, minBarPx) : 0;
							const neutralH =
								bin.neutral > 0 ? Math.max((bin.neutral / maxPositive) * halfH, minBarPx) : 0;
							const uncategorizedH =
								bin.uncategorized > 0
									? Math.max((bin.uncategorized / maxPositive) * halfH, minBarPx)
									: 0;
							const distractingH =
								bin.distracting > 0
									? Math.max((bin.distracting / maxNegative) * halfH, minBarPx)
									: 0;

							const focusedActivities = bin.activities.filter((a) => a.category === 'focused');
							const neutralActivities = bin.activities.filter((a) => a.category === 'neutral');
							const uncategorizedActivities = bin.activities.filter((a) =>
								isUncategorizedActivity(a.category)
							);
							const distractingActivities = bin.activities.filter(
								(a) => a.category === 'distracting'
							);

							return (
								<div key={h} className="relative flex flex-1 flex-col">
									{/* Upper half — focused (bottom), neutral, uncategorized (top), touching axis */}
									<div className="flex flex-col justify-end" style={{ height: halfH }}>
										{uncategorizedH > 0 && (
											<Tooltip
												content={
													<FocusCategoryTooltip
														category={null}
														durationMs={bin.uncategorized}
														activities={uncategorizedActivities}
													/>
												}
												side={tooltipSide}
												sideOffset={8}
											>
												<div
													className="w-full cursor-default hover:opacity-80"
													style={{
														height: uncategorizedH,
														backgroundColor: categoryToColor(null)
													}}
												/>
											</Tooltip>
										)}
										{neutralH > 0 && (
											<Tooltip
												content={
													<FocusCategoryTooltip
														category="neutral"
														durationMs={bin.neutral}
														activities={neutralActivities}
													/>
												}
												side={tooltipSide}
												sideOffset={8}
											>
												<div
													className="w-full cursor-default hover:opacity-80"
													style={{ height: neutralH, backgroundColor: categoryToColor('neutral') }}
												/>
											</Tooltip>
										)}
										{focusedH > 0 && (
											<Tooltip
												content={
													<FocusCategoryTooltip
														category="focused"
														durationMs={bin.focused}
														activities={focusedActivities}
													/>
												}
												side={tooltipSide}
												sideOffset={8}
											>
												<div
													className="w-full cursor-default hover:opacity-80"
													style={{ height: focusedH, backgroundColor: categoryToColor('focused') }}
												/>
											</Tooltip>
										)}
									</div>

									{/* Lower half — distracting, growing down from axis */}
									<div className="flex flex-col" style={{ height: halfH }}>
										{distractingH > 0 && (
											<Tooltip
												content={
													<FocusCategoryTooltip
														category="distracting"
														durationMs={bin.distracting}
														activities={distractingActivities}
													/>
												}
												side={tooltipSide}
												sideOffset={8}
											>
												<div
													className="w-full cursor-default hover:opacity-80"
													style={{
														height: distractingH,
														backgroundColor: categoryToColor('distracting')
													}}
												/>
											</Tooltip>
										)}
									</div>
								</div>
							);
						})}

						{/* Axis line */}
						<div
							className="bg-base-300 pointer-events-none absolute inset-x-0 h-px"
							style={{ top: halfH }}
						/>
					</div>
				</div>

				{/* Hour axis labels */}
				<div className="mt-2 flex gap-px px-2">
					{Array.from({ length: 24 }, (_, h) => (
						<div key={h} className="flex-1 text-center">
							{hourAxisLabels[h] != null && (
								<span className="text-base-400 text-[10px]">{hourAxisLabels[h]}</span>
							)}
						</div>
					))}
				</div>
			</div>
		</TooltipProvider>
	);
};

interface TActivityBalanceChartProps {
	activities: specta.WindowActivityDto[];
	startOfDay: number;
	halfH?: number;
	minBarPx?: number;
}

function computeBins(activities: specta.WindowActivityDto[], startOfDay: number): THourBin[] {
	const bins: THourBin[] = Array.from({ length: 24 }, () => ({
		focused: 0,
		neutral: 0,
		uncategorized: 0,
		distracting: 0,
		activities: []
	}));

	for (const activity of activities) {
		for (let h = 0; h < 24; h++) {
			const hourStart = startOfDay + h * 3_600_000;
			const hourEnd = hourStart + 3_600_000;
			const clippedStart = Math.max(activity.startedAt, hourStart);
			const clippedEnd = Math.min(activity.endedAt, hourEnd);
			const overlap = clippedEnd - clippedStart;
			if (overlap <= 0) continue;

			const bin = bins[h];
			if (bin == null) continue;
			const cat = activity.category as FocusViewCategory | null;
			if (cat === 'focused') bin.focused += overlap;
			else if (cat === 'neutral') bin.neutral += overlap;
			else if (cat === 'distracting') bin.distracting += overlap;
			else bin.uncategorized += overlap;

			bin.activities.push({ ...activity, startedAt: clippedStart, endedAt: clippedEnd });
		}
	}

	return bins;
}

interface THourBin {
	focused: number; // ms
	neutral: number; // ms
	uncategorized: number; // ms
	distracting: number; // ms
	/** Activities clipped to this hour's boundaries */
	activities: specta.WindowActivityDto[];
}

function isUncategorizedActivity(category: specta.WindowActivityDto['category']): boolean {
	return category !== 'focused' && category !== 'neutral' && category !== 'distracting';
}

function niceTickInterval(maxMs: number, maxTicks = 3): number {
	const intervals = [60_000, 120_000, 300_000, 600_000, 900_000, 1_800_000, 3_600_000];
	return intervals.find((i) => Math.ceil(maxMs / i) <= maxTicks) ?? 3_600_000;
}

function computeTicks(maxMs: number): number[] {
	if (maxMs <= 0) return [];
	const interval = niceTickInterval(maxMs);
	const ticks: number[] = [];
	for (let t = interval; t < maxMs; t += interval) {
		ticks.push(t);
	}
	return ticks;
}
