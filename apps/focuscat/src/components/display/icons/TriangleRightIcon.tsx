import React from 'react';
import type { TIconProps } from './types';

export const TriangleRightIcon = React.forwardRef<SVGSVGElement, TIconProps>((props, ref) => {
	return (
		<svg
			ref={ref}
			fill="currentColor"
			viewBox="0 0 24 24"
			xmlns="http://www.w3.org/2000/svg"
			{...props}
		>
			<path d="M24 12L0 24V0L24 12Z" />
		</svg>
	);
});
TriangleRightIcon.displayName = 'TriangleRightIcon';
