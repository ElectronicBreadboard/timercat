import { formatDuration } from '@repo/ui';
import React from 'react';
import type { specta } from '@/environment';
import { categoryToColor, categoryToLabel, type FocusViewCategory } from '@/features/focus';

export const FocusCategorySummary: React.FC<TCategorySummaryProps> = (props) => {
	const { activities } = props;

	const stats = React.useMemo(() => {
		const totals: Record<FocusViewCategory | 'uncategorized', number> = {
			focused: 0,
			neutral: 0,
			distracting: 0,
			uncategorized: 0
		};
		for (const a of activities) {
			const dur = a.endedAt - a.startedAt;
			const cat = a.category as FocusViewCategory | null;
			if (cat === 'focused' || cat === 'neutral' || cat === 'distracting') {
				totals[cat] += dur;
			} else {
				totals.uncategorized += dur;
			}
		}
		return totals;
	}, [activities]);

	const total = stats.focused + stats.neutral + stats.distracting + stats.uncategorized;
	if (total === 0) return null;

	const categorized = stats.focused + stats.neutral + stats.distracting;
	if (categorized === 0) return null;

	const items: Array<{ key: FocusViewCategory; ms: number }> = [
		{ key: 'focused', ms: stats.focused },
		{ key: 'neutral', ms: stats.neutral },
		{ key: 'distracting', ms: stats.distracting }
	].filter((item) => item.ms > 0) as Array<{ key: FocusViewCategory; ms: number }>;

	return (
		<div className="flex flex-col gap-1.5">
			<div className="px-2">
				<span className="text-base-500 text-xs font-medium">Focus Summary</span>
			</div>

			{/* Proportional bar */}
			<div className="flex h-1.5 overflow-hidden rounded-full">
				{items.map(({ key, ms }) => (
					<div
						key={key}
						style={{
							width: `${(ms / categorized) * 100}%`,
							backgroundColor: categoryToColor(key)
						}}
					/>
				))}
			</div>

			{/* Labels */}
			<div className="flex gap-3">
				{items.map(({ key, ms }) => (
					<div key={key} className="flex items-center gap-1">
						<div
							className="size-2 shrink-0 rounded-full"
							style={{ backgroundColor: categoryToColor(key) }}
						/>
						<span className="text-base-500 text-xs">
							{categoryToLabel(key)}: {formatDuration(ms / 1000)}
						</span>
					</div>
				))}
			</div>
		</div>
	);
};

interface TCategorySummaryProps {
	activities: specta.WindowActivityDto[];
}
