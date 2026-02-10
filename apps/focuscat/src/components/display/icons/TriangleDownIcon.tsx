import React from 'react';
import type { TIconProps } from './types';

export const TriangleDownIcon = React.forwardRef<SVGSVGElement, TIconProps>((props, ref) => {
	return (
		<svg
			ref={ref}
			fill="currentColor"
			viewBox="0 0 24 24"
			xmlns="http://www.w3.org/2000/svg"
			{...props}
		>
			<path d="M12 24L0 0H24L12 24Z" />
		</svg>
	);
});
TriangleDownIcon.displayName = 'TriangleDownIcon';
