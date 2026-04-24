import React from 'react';
import { GithubIcon } from '@/components/display/icons';
import { appConfig } from '@/environment';

export const GithubWindow: React.FC = () => {
	return (
		<div data-drag-region className="group flex h-full w-full overflow-hidden rounded-xl shadow-lg">
			<a
				href={appConfig.distribution.github}
				target="_blank"
				rel="noopener noreferrer"
				draggable={false}
				className="bg-base-0 text-base-900 flex min-w-0 flex-1 items-center justify-center rounded-xl transition hover:opacity-90"
			>
				<GithubIcon className="h-7 w-auto" aria-hidden />
			</a>
		</div>
	);
};
