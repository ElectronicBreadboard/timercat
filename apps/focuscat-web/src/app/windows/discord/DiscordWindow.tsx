import { DiscordWordmarkLogo } from '@repo/ui';
import React from 'react';
import { appConfig } from '@/environment';
import { DragWidgetHandle, RemoveWidgetHandle, WidgetHandleSpacer } from '@/features/window';

export const DiscordWindow: React.FC<TDiscordWindowProps> = (props) => {
	const { onClose } = props;

	return (
		<div className="group flex h-full w-full overflow-hidden rounded-xl shadow-lg">
			<a
				href={appConfig.help.discord}
				target="_blank"
				rel="noopener noreferrer"
				className="flex min-w-0 flex-1 items-center justify-center rounded-xl bg-[#E0E3FF] p-3 transition hover:opacity-90"
			>
				<DiscordWordmarkLogo className="h-5 w-auto text-[#5865F2]" aria-hidden />
			</a>
			<RemoveWidgetHandle
				className="absolute -top-4 right-13 h-4 w-8 rounded-t-lg"
				onRemove={onClose}
			/>
			<WidgetHandleSpacer className="absolute -top-4 right-12 h-4 w-1" />
			<DragWidgetHandle className="absolute -top-4 right-4 h-4 w-8 rounded-t-lg" rotateIcon />
		</div>
	);
};

export interface TDiscordWindowProps {
	onClose?: () => void;
}
