import { Button } from '@base-ui/react/button';
import { createFileRoute } from '@tanstack/react-router';
import { getCurrentWindow } from '@tauri-apps/api/window';
import React from 'react';
import { ExpandIcon, GripIcon } from '@/components';
import { specta } from '@/environment';
import { Cat } from '@/features/cat';
import { useAppSettings } from '@/hooks';
import { cn } from '@/lib';

export const Route = createFileRoute('/window/cat/')({
	component: RouteComponent
});

function RouteComponent() {
	const [tapCount, setTapCount] = React.useState(0);
	const [settings] = useAppSettings();

	// MARK: - Actions

	const handleCatTap = React.useCallback(() => {
		setTapCount((prev) => prev + 1);
	}, []);

	const handleExpand = React.useCallback(async () => {
		await specta.commands.showMainWindow();
		await specta.commands.hideCatWindow();
	}, []);

	// MARK: - Render

	return (
		<div className={cn('flex flex-col items-center', settings.debug && 'border border-red-500')}>
			<Cat
				className={cn('z-10', settings.debug && 'border border-green-500')}
				onTap={handleCatTap}
			/>

			<div
				className={cn(
					'flex items-center rounded-lg bg-gray-800/90 shadow-lg',
					settings.debug && 'border border-blue-500'
				)}
			>
				{/* Drag Handle */}
				<div
					className="flex cursor-grab items-center px-2 py-2 active:cursor-grabbing"
					onPointerDown={(e) => {
						if (e.button === 0) {
							getCurrentWindow().startDragging();
						}
					}}
				>
					<GripIcon size={14} className="text-gray-500" />
				</div>

				{/* Counter */}
				<span className="min-w-[32px] px-2 text-center font-mono text-sm text-white select-none">
					{tapCount}
				</span>

				{/* Expand Button */}
				<Button
					className="flex items-center px-2 py-2 text-gray-400 transition-colors hover:text-white"
					onClick={handleExpand}
				>
					<ExpandIcon size={14} />
				</Button>
			</div>
		</div>
	);
}
