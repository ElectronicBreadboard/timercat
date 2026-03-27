import { formatDuration, Tooltip, TooltipProvider } from '@repo/ui';
import React from 'react';
import type { specta } from '@/environment';
import { categoryToColor, FocusCategoryTooltip } from '@/features/focus';

export const FocusPulse: React.FC<TFocusPulseProps> = (props) => {
	const { activities } = props;

	const { focusedMs, neutralMs, distractingMs, uncategorizedMs, categorizedMs, score } =
		React.useMemo(() => {
			let focusedMs = 0;
			let neutralMs = 0;
			let distractingMs = 0;
			let uncategorizedMs = 0;
			for (const a of activities) {
				const dur = a.endedAt - a.startedAt;
				if (a.category === 'focused') focusedMs += dur;
				else if (a.category === 'neutral') neutralMs += dur;
				else if (a.category === 'distracting') distractingMs += dur;
				else uncategorizedMs += dur;
			}
			const categorizedMs = focusedMs + neutralMs + distractingMs;
			const score =
				categorizedMs === 0
					? 0
					: Math.min(100, Math.round(((focusedMs + neutralMs * 0.5) / categorizedMs) * 100));
			return { focusedMs, neutralMs, distractingMs, uncategorizedMs, categorizedMs, score };
		}, [activities]);

	const size = 128;
	const center = size / 2;
	const r = 52;
	const strokeWidth = 14;
	const c = 2 * Math.PI * r;
	const totalMs = categorizedMs + uncategorizedMs;

	const focusedLen = totalMs > 0 ? (focusedMs / totalMs) * c : 0;
	const neutralLen = totalMs > 0 ? (neutralMs / totalMs) * c : 0;
	const distractingLen = totalMs > 0 ? (distractingMs / totalMs) * c : 0;
	const uncategorizedLen = totalMs > 0 ? (uncategorizedMs / totalMs) * c : 0;
	const categorizedPct = totalMs > 0 ? Math.round((categorizedMs / totalMs) * 100) : 0;

	const focusedActivities = React.useMemo(
		() => activities.filter((activity) => activity.category === 'focused'),
		[activities]
	);
	const neutralActivities = React.useMemo(
		() => activities.filter((activity) => activity.category === 'neutral'),
		[activities]
	);
	const distractingActivities = React.useMemo(
		() => activities.filter((activity) => activity.category === 'distracting'),
		[activities]
	);
	const uncategorizedActivities = React.useMemo(
		() => activities.filter((activity) => isUncategorizedActivity(activity.category)),
		[activities]
	);

	// MARK: - UI

	return (
		<TooltipProvider delay={300} closeDelay={50}>
			<div className="flex flex-col items-center gap-1.5">
				{/* Donut */}
				<div className="relative" style={{ width: size, height: size }}>
					<svg width={size} height={size}>
						{/* Background track */}
						<circle
							cx={center}
							cy={center}
							r={r}
							fill="none"
							strokeWidth={strokeWidth}
							className="text-base-100"
							stroke="currentColor"
						/>
						{/* Focused arc */}
						{focusedLen > 0 && (
							<Tooltip
								content={
									<FocusCategoryTooltip
										category="focused"
										durationMs={focusedMs}
										activities={focusedActivities}
									/>
								}
								side="left"
								positionerClassName="z-50"
							>
								<circle
									cx={center}
									cy={center}
									r={r}
									fill="none"
									strokeWidth={strokeWidth}
									stroke={categoryToColor('focused')}
									strokeDasharray={`${focusedLen} ${c}`}
									strokeDashoffset={0}
									transform={`rotate(-90 ${center} ${center})`}
									className="cursor-default transition-opacity hover:opacity-80"
								/>
							</Tooltip>
						)}
						{/* Neutral arc */}
						{neutralLen > 0 && (
							<Tooltip
								content={
									<FocusCategoryTooltip
										category="neutral"
										durationMs={neutralMs}
										activities={neutralActivities}
									/>
								}
								side="left"
								positionerClassName="z-50"
							>
								<circle
									cx={center}
									cy={center}
									r={r}
									fill="none"
									strokeWidth={strokeWidth}
									stroke={categoryToColor('neutral')}
									strokeDasharray={`${neutralLen} ${c}`}
									strokeDashoffset={-focusedLen}
									transform={`rotate(-90 ${center} ${center})`}
									className="cursor-default transition-opacity hover:opacity-80"
								/>
							</Tooltip>
						)}
						{/* Distracting arc */}
						{distractingLen > 0 && (
							<Tooltip
								content={
									<FocusCategoryTooltip
										category="distracting"
										durationMs={distractingMs}
										activities={distractingActivities}
									/>
								}
								side="left"
								positionerClassName="z-50"
							>
								<circle
									cx={center}
									cy={center}
									r={r}
									fill="none"
									strokeWidth={strokeWidth}
									stroke={categoryToColor('distracting')}
									strokeDasharray={`${distractingLen} ${c}`}
									strokeDashoffset={-(focusedLen + neutralLen)}
									transform={`rotate(-90 ${center} ${center})`}
									className="cursor-default transition-opacity hover:opacity-80"
								/>
							</Tooltip>
						)}
						{/* Uncategorized arc */}
						{uncategorizedLen > 0 && (
							<Tooltip
								content={
									<FocusCategoryTooltip
										category={null}
										durationMs={uncategorizedMs}
										activities={uncategorizedActivities}
									/>
								}
								side="left"
								positionerClassName="z-50"
							>
								<circle
									cx={center}
									cy={center}
									r={r}
									fill="none"
									strokeWidth={strokeWidth}
									stroke={categoryToColor(null)}
									strokeDasharray={`${uncategorizedLen} ${c}`}
									strokeDashoffset={-(focusedLen + neutralLen + distractingLen)}
									transform={`rotate(-90 ${center} ${center})`}
									className="cursor-default transition-opacity hover:opacity-80"
								/>
							</Tooltip>
						)}
					</svg>
					{/* Score */}
					<div className="pointer-events-none absolute inset-0 flex items-center justify-center">
						<span className="text-base-900 text-3xl font-bold tabular-nums">{score}</span>
					</div>
				</div>

				{/* Label */}
				<span className="text-base-400 text-[11px]">focus score</span>
				<span className="text-base-400 text-[11px]">
					{uncategorizedMs > 0
						? `${categorizedPct}% categorized · ${formatDuration(uncategorizedMs / 1000)} uncategorized`
						: 'fully categorized'}
				</span>
			</div>
		</TooltipProvider>
	);
};

interface TFocusPulseProps {
	activities: specta.WindowActivityDto[];
}

function isUncategorizedActivity(category: specta.WindowActivityDto['category']): boolean {
	return category !== 'focused' && category !== 'neutral' && category !== 'distracting';
}
