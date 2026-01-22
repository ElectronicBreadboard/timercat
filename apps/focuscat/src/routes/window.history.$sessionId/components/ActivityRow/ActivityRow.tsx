import { useFeatureState } from 'feature-react/state';
import React from 'react';
import { TooltipProvider, useTimelineCx } from '@/components';
import type { specta } from '@/environment';
import { useMemoCleanup } from '@/hooks';
import { ActivityRowCx } from './ActivityRowCx';
import { AppBlock, WindowBlock } from './components';

export const ActivityRow: React.FC<TActivityRowProps> = (props) => {
	const { activities } = props;
	const timelineCx = useTimelineCx();
	const cx = useMemoCleanup(() => {
		const instance = new ActivityRowCx(timelineCx, activities);
		return [instance, () => instance.unmount()];
	}, [timelineCx, activities]);

	const blocks = useFeatureState(cx.$blocks);

	// MARK: - UI

	return (
		<TooltipProvider delay={200} closeDelay={100}>
			<div className="bg-base-100 relative h-10">
				{blocks.map((block, index) =>
					block.type === 'window' ? (
						<WindowBlock key={`${block.startMs}-${index}`} block={block} cx={cx} />
					) : (
						<AppBlock key={`${block.startMs}-${index}`} block={block} cx={cx} />
					)
				)}
			</div>
		</TooltipProvider>
	);
};

export interface TActivityRowProps {
	activities: specta.WindowActivityDto[];
}
