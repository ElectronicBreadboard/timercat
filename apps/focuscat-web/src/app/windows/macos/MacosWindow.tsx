import React from 'react';
import { AppleIcon } from '@/components/display/icons';
import { appConfig } from '@/environment';

export const MacosWindow: React.FC = () => {
	return (
		<div data-drag-region className="group flex h-full w-full overflow-hidden rounded-xl shadow-lg">
			<a
				href={appConfig.distribution.website}
				target="_blank"
				rel="noopener noreferrer"
				draggable={false}
				className="bg-base-0 flex min-w-0 flex-1 items-center justify-center rounded-xl p-3 transition hover:opacity-90"
			>
				<AppleIcon className="text-base-900 h-6 w-auto" aria-hidden />
			</a>
		</div>
	);
};
