import React from 'react';
import { TriangleLeftIcon, TriangleRightIcon } from '@/components';
import { cn } from '@/lib';
import { ActiveProfilesView } from './ActiveProfilesView';
import { FocusGoalView } from './FocusGoalView';
import { LastSessionView } from './LastSessionView';

export const OverviewCard: React.FC<TOverviewCardProps> = (props) => {
	const { className } = props;

	const views = React.useMemo<TViewConfig[]>(
		() => [
			{ id: 'focus-goal', label: 'Focus Goal' },
			{ id: 'last-session', label: 'Last Session' },
			{ id: 'active-profiles', label: 'Active Profiles' }
		],
		[]
	);
	const [viewIndex, setViewIndex] = React.useState(0);
	const currentView = views[viewIndex] ?? (views[0] as TViewConfig);

	// MARK: - Actions

	const handlePrev = React.useCallback(() => {
		setViewIndex((i) => (i - 1 + views.length) % views.length);
	}, [views]);

	const handleNext = React.useCallback(() => {
		setViewIndex((i) => (i + 1) % views.length);
	}, [views]);

	// MARK: - UI

	return (
		<div className={cn('flex flex-col px-3 pt-2 pb-3', className)}>
			{/* Header */}
			<div className="flex items-center justify-between">
				<p className="text-base-400 text-[10px] font-medium tracking-wider uppercase">
					{currentView.label}
				</p>
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
