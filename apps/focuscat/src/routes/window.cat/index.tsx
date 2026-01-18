import { Button } from '@base-ui/react/button';
import { createFileRoute } from '@tanstack/react-router';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useFeatureState } from 'feature-react/state';
import React from 'react';
import { ExpandIcon, GripIcon } from '@/components';
import { specta } from '@/environment';
import { Cat, type TCatRef } from '@/features/cat';
import { useSettingsCx } from '@/features/settings';
import { useInputTap, useTimerState } from '@/hooks';
import { cn, formatTime } from '@/lib';

export const Route = createFileRoute('/window/cat/')({
	component: RouteComponent
});

function RouteComponent() {
	const timerState = useTimerState();
	const settingsCx = useSettingsCx();
	const settings = useFeatureState(settingsCx.$appSettings);
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
		<div
			className={cn('flex flex-col items-center', settings.debug.cat && 'border border-red-500')}
		>
			<Cat ref={catRef} className={cn('z-10', settings.debug.cat && 'border border-green-500')} />

			<div
				className={cn(
					'bg-base-100 flex items-center rounded-lg shadow-lg',
					settings.debug.cat && 'border border-blue-500'
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
					<GripIcon size={14} className="text-base-500" />
				</div>

				{/* Timer Display */}
				<span
					className={cn(
						'min-w-[48px] px-2 text-center font-mono text-sm select-none',
						timerState?.status === 'running' ? 'text-base-950' : 'text-base-400'
					)}
				>
					{formatTime(timerState?.remainingSeconds ?? 0)}
				</span>

				{/* Expand Button */}
				<Button
					className="text-base-400 hover:text-base-950 flex items-center px-2 py-2 transition-colors"
					onClick={handleExpand}
				>
					<ExpandIcon size={14} />
				</Button>
			</div>
		</div>
	);
}
