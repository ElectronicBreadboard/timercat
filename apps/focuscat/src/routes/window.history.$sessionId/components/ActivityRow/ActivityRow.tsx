import { useFeatureState } from 'feature-react';
import React from 'react';
import { TooltipProvider } from '@/components';
import { ActivityRowCx } from './ActivityRowCx';
import { AppBlock, WindowGroupBlock } from './components';

export const ActivityRow: React.FC<TActivityRowProps> = (props) => {
	const { cx } = props;
	const blocks = useFeatureState(cx.$blocks);

	return (
		<TooltipProvider delay={200} closeDelay={100}>
			<div className="bg-base-100 relative h-10">
				{blocks.map((block, index) => {
					const key = `${block.startMs}-${index}`;
					switch (block.type) {
						case 'window-group':
							return <WindowGroupBlock key={key} block={block} cx={cx} />;
						case 'app':
							return <AppBlock key={key} block={block} cx={cx} />;
						case 'window':
							// Currently grouped into window-group by aggregation algorithm
							// TODO: Render directly at high zoom levels?
							return null;
					}
				})}
			</div>
		</TooltipProvider>
	);
};

export interface TActivityRowProps {
	cx: ActivityRowCx;
}
