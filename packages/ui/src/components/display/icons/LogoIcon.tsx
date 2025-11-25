import React from 'react';
import type { TIconProps } from './types';

export const LogoIcon = React.forwardRef<SVGSVGElement, TIconProps>((props, ref) => {
	return (
		<svg
			ref={ref}
			fill="none"
			stroke="currentColor"
			stroke-width="3.84"
			viewBox="0 0 24 24"
			xmlns="http://www.w3.org/2000/svg"
			{...props}
		>
			<path d="M4.80005 16.0039H19.2M4.80005 10.2439C9.16002 7.3373 14.8401 7.3373 19.2 10.2439" />
		</svg>
	);
});
LogoIcon.displayName = 'Logo Icon';
