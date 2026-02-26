import { GripIcon } from '@repo/ui';
import React from 'react';
import { AppleIcon } from '@/components/display/icons';
import { appConfig } from '@/environment';

export const MacosWindow: React.FC = () => {
	const handlePointerDown = useGrabbingCursorOnDrag();

	return (
		<div className="group flex h-full w-full overflow-hidden rounded-xl shadow-lg">
			<a
				href={appConfig.distribution.website}
				target="_blank"
				rel="noopener noreferrer"
				className="bg-base-0 flex min-w-0 flex-1 items-center justify-center rounded-xl p-3 transition hover:opacity-90"
			>
				<AppleIcon className="text-base-900 h-6 w-auto" aria-hidden />
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
