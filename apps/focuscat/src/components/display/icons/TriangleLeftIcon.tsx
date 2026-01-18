import React from 'react';
import type { TIconProps } from './types';

export const TriangleLeftIcon = React.forwardRef<SVGSVGElement, TIconProps>((props, ref) => {
	return (
		<svg
			ref={ref}
			fill="currentColor"
			viewBox="0 0 24 24"
			xmlns="http://www.w3.org/2000/svg"
			{...props}
		>
			<path d="M0 12L24 0V24L0 12Z" />
		</svg>
	);
});
TriangleLeftIcon.displayName = 'TriangleLeftIcon';
