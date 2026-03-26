import { TooltipProvider } from '@repo/ui';
import { useCombinedCompute } from 'feature-react/state';
import React from 'react';
import { ActivityRowCx } from './ActivityRowCx';
import { AppBlock, CategoryBlock, WindowGroupBlock } from './components';
import type { TActivityBlock } from './types';

export const ActivityRow: React.FC<TActivityRowProps> = (props) => {
	const { cx } = props;

	const blocks = useCombinedCompute(
		[cx.$blocks, cx.timelineCx.$visibleRange] as const,
		([{ value: allBlocks = [] }, { value: range = { startMs: 0, endMs: Infinity } }]) =>
			allBlocks.filter((b) => b.endMs > range.startMs && b.startMs < range.endMs),
		[cx, cx.timelineCx],
		{ isEqual: blocksEqual }
	);

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
						case 'category':
							return <CategoryBlock key={key} block={block} cx={cx} />;
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

function blocksEqual(a: TActivityBlock[], b: TActivityBlock[]): boolean {
	if (a.length !== b.length) return false;
	for (let i = 0; i < a.length; i++) {
		if (a[i]?.startMs !== b[i]?.startMs || a[i]?.endMs !== b[i]?.endMs) return false;
	}
	return true;
}
