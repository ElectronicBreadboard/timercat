import { DiscordWordmarkLogo } from '@repo/ui';
import React from 'react';
import { appConfig } from '@/environment';

export const DiscordWindow: React.FC = () => {
	return (
		<div data-drag-region className="group flex h-full w-full overflow-hidden rounded-xl shadow-lg">
			<a
				href={appConfig.help.discord}
				target="_blank"
				rel="noopener noreferrer"
				draggable={false}
				className="flex min-w-0 flex-1 items-center justify-center rounded-xl bg-[#E0E3FF] transition hover:opacity-90"
			>
				<DiscordWordmarkLogo className="h-5 w-auto text-[#5865F2]" aria-hidden />
			</a>
		</div>
	);
};
