import { useFeatureState } from 'feature-react';
import React from 'react';
import { TooltipProvider } from '@/components';
import { ActivityRowCx } from './ActivityRowCx';
import { AppBlock, WindowBlock } from './components';

export const ActivityRow: React.FC<TActivityRowProps> = (props) => {
	const { cx } = props;
	const blocks = useFeatureState(cx.$blocks);

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
	cx: ActivityRowCx;
}
