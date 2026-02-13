import React from 'react';
import type { TIconProps } from './types';

export const TriangleUpIcon = React.forwardRef<SVGSVGElement, TIconProps>((props, ref) => {
	return (
		<svg
			ref={ref}
			fill="currentColor"
			viewBox="0 0 24 24"
			xmlns="http://www.w3.org/2000/svg"
			{...props}
		>
			<path d="M12 0L24 24H0L12 0Z" />
		</svg>
	);
});
TriangleUpIcon.displayName = 'TriangleUpIcon';
