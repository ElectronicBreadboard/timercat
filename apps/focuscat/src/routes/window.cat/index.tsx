import { Button } from '@base-ui/react/button';
import { createFileRoute } from '@tanstack/react-router';
import { getCurrentWindow } from '@tauri-apps/api/window';
import React from 'react';
import { ExpandIcon, GripIcon } from '@/components';
import { specta } from '@/environment';
import { Cat, type TCatRef } from '@/features/cat';
import { useAppSettings, useInputTap, useTimerState } from '@/hooks';
import { cn } from '@/lib';

export const Route = createFileRoute('/window/cat/')({
	component: RouteComponent
});

function RouteComponent() {
	const timerState = useTimerState();
	const [settings] = useAppSettings();
	const catRef = React.useRef<TCatRef>(null);

	// Tap cat on global input events
	useInputTap(catRef);

	// MARK: - Actions

	const handleExpand = React.useCallback(async () => {
		await specta.commands.showMainWindow();
		await specta.commands.hideCatWindow();
	}, []);

	// MARK: - UI

	return (
		<div className={cn('flex flex-col items-center', settings.debug && 'border border-red-500')}>
			<Cat ref={catRef} className={cn('z-10', settings.debug && 'border border-green-500')} />

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

				{/* Timer Display */}
				<span
					className={cn(
						'min-w-[48px] px-2 text-center font-mono text-sm select-none',
						timerState?.status === 'running' ? 'text-white' : 'text-gray-400'
					)}
				>
					{formatTime(timerState?.remainingSeconds ?? 0)}
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

function formatTime(seconds: number): string {
	const mins = Math.floor(seconds / 60);
	const secs = seconds % 60;
	return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
