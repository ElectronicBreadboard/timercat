import React from 'react';
import type { TIconProps } from './types';

export const SimpleLogoIcon = React.forwardRef<SVGSVGElement, TIconProps>((props, ref) => {
	const clipId = React.useId();
	return (
		<svg
			ref={ref}
			viewBox="0 0 256 256"
			fill="currentColor"
			xmlns="http://www.w3.org/2000/svg"
			{...props}
		>
			<g clipPath={`url(#${clipId})`}>
				<path
					d="M190.376 105.542C172.973 99.4157 136.739 89.089 106.78 88.4436C104.934 88.4038 103.16 87.5784 101.946 86.1871C75.3723 55.7198 79.6191 70.1483 68.1904 95.4676C67.7022 96.5493 66.8899 97.4675 65.9036 98.1276C31.258 121.318 14.3009 161.701 9.41489 180.488C8.45991 184.16 11.3334 187.454 15.1274 187.454H242.014C245.069 187.454 247.682 185.254 247.581 182.2C247.29 173.431 243.839 158.692 233.57 143.435C232.723 142.176 232.312 140.679 232.44 139.166C233.926 121.664 234.935 90.6029 228.27 89.997C221.951 89.4225 205.609 98.7838 196.114 104.869C194.404 105.964 192.291 106.216 190.376 105.542Z"
					stroke="currentColor"
					strokeWidth={6.339}
					fill="currentColor"
				/>
			</g>
			<defs>
				<clipPath id={clipId}>
					<rect width="256" height="256" fill="white" />
				</clipPath>
			</defs>
		</svg>
	);
});
SimpleLogoIcon.displayName = 'SimpleLogoIcon';
