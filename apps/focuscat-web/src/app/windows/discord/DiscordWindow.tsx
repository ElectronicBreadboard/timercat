import { DiscordWordmarkLogo, GripIcon } from '@repo/ui';
import React from 'react';

export const DiscordWindow: React.FC = () => {
	const handlePointerDown = useGrabbingCursorOnDrag();

	return (
		<div className="group flex h-full w-full overflow-hidden rounded-xl shadow-lg">
			<a
				href="https://discord.com/invite/w4xE3bSjhQ"
				target="_blank"
				rel="noopener noreferrer"
				className="flex min-w-0 flex-1 items-center justify-center rounded-xl bg-[#E0E3FF] p-3 transition hover:opacity-90"
			>
				<DiscordWordmarkLogo className="h-5 w-auto text-[#5865F2]" aria-hidden />
			</a>
			<div
				data-drag-region
				className="bg-base-100/90 absolute top-2 -right-4 flex h-8 w-4 cursor-grab items-center justify-center rounded-r-lg opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing active:opacity-100"
				onPointerDown={handlePointerDown}
			>
				<GripIcon
					size={12}
					className="text-base-500/60 group-hover:text-base-600 active:text-base-600 transition-colors"
				/>
			</div>
		</div>
	);
};

function useGrabbingCursorOnDrag(): (e: React.PointerEvent) => void {
	return React.useCallback((e: React.PointerEvent) => {
		if (e.button !== 0) {
			return;
		}
		document.body.style.cursor = 'grabbing';
		const clear = () => {
			document.body.style.cursor = '';
			document.removeEventListener('pointerup', clear);
			document.removeEventListener('pointercancel', clear);
		};
		document.addEventListener('pointerup', clear);
		document.addEventListener('pointercancel', clear);
	}, []);
}
