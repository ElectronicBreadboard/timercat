import React from 'react';
import type { TIconProps } from './types';

export const ResizeGripIcon = React.forwardRef<SVGSVGElement, TIconProps>((props, ref) => {
	return (
		<svg ref={ref} viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
			<path d="M7 1L1 7M7 4L4 7" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
		</svg>
	);
});
ResizeGripIcon.displayName = 'ResizeGripIcon';
