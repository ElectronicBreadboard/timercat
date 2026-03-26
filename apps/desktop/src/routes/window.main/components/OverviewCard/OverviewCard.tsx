import { cn, TriangleLeftIcon, TriangleRightIcon } from '@repo/ui';
import { useFeatureState } from 'feature-react/state';
import React from 'react';
import { useSettingsCx } from '@/features/settings';
import { ActiveProfilesView } from './ActiveProfilesView';
import { FocusGoalView } from './FocusGoalView';
import { LastSessionView } from './LastSessionView';

export const OverviewCard: React.FC<TOverviewCardProps> = (props) => {
	const { className } = props;

	const settingsCx = useSettingsCx();
	const settings = useFeatureState(settingsCx.$appSettings);

	const views = React.useMemo<TViewConfig[]>(() => {
		const result: TViewConfig[] = [];
		if (settings.features.goals) {
			result.push({ id: 'focus-goal', label: 'Focus Goal' });
		}
		result.push({ id: 'last-session', label: 'Last Session' });
		if (settings.features.focus) {
			result.push({ id: 'active-profiles', label: 'Active Profiles' });
		}
		return result;
	}, [settings.features.goals, settings.features.focus]);

	const [viewIndex, setViewIndex] = React.useState(0);

	const currentView = views[viewIndex] ?? (views[0] as TViewConfig);

	// MARK: - Actions

	const handlePrev = React.useCallback(() => {
		setViewIndex((i) => (i - 1 + views.length) % views.length);
	}, [views]);

	const handleNext = React.useCallback(() => {
		setViewIndex((i) => (i + 1) % views.length);
	}, [views]);

	// MARK: - Effects

	// Clamp viewIndex when views shrink
	React.useEffect(() => {
		setViewIndex((i) => (i >= views.length ? 0 : i));
	}, [views.length]);

	// MARK: - UI

	return (
		<div className={cn('flex flex-col px-3 pt-2 pb-3', className)}>
			{/* Header */}
			<div className="flex items-center justify-between">
				<p className="text-base-400 text-[10px] font-medium tracking-wider uppercase">
					{currentView.label}
				</p>
				{views.length > 1 && (
					<div className="-mr-2 flex items-center">
						<button
							type="button"
							onClick={handlePrev}
							className="text-base-300 hover:text-base-500 py-1 pr-0.5 pl-2 transition-colors"
						>
							<TriangleLeftIcon width={6} height={8} preserveAspectRatio="none" />
						</button>
						<button
							type="button"
							onClick={handleNext}
							className="text-base-300 hover:text-base-500 py-1 pr-2 pl-0.5 transition-colors"
						>
							<TriangleRightIcon width={6} height={8} preserveAspectRatio="none" />
						</button>
					</div>
				)}
			</div>

			{/* Content */}
			{currentView.id === 'focus-goal' && <FocusGoalView />}
			{currentView.id === 'last-session' && <LastSessionView />}
			{currentView.id === 'active-profiles' && <ActiveProfilesView />}
		</div>
	);
};

interface TViewConfig {
	id: string;
	label: string;
}

interface TOverviewCardProps {
	className?: string;
}
