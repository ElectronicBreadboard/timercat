import { useBoundingRectObserver } from '@repo/ui';
import React from 'react';
import { useWindowCx } from '@/features/window';
import { DraggableWindow } from './components';
import { MainWindow } from './windows/main';
import { SettingsWindow } from './windows/settings';

export const App: React.FC = () => {
	const windowCx = useWindowCx();

	// MARK: - Actions

	const handleBackgroundClick = React.useCallback(
		(e: React.MouseEvent<HTMLDivElement>) => {
			if ((e.target as HTMLElement).closest('[data-window]') == null) {
				windowCx.clearFocus();
			}
		},
		[windowCx]
	);

	// MARK: - Effects

	useBoundingRectObserver(
		windowCx.containerRef,
		{ width: 0, height: 0 },
		(rect) => {
			windowCx.$containerRect.set({
				width: rect.width ?? 0,
				height: rect.height ?? 0
			});
		},
		[windowCx]
	);

	// MARK: - UI

	return (
		<div
			ref={windowCx.containerRef}
			className="bg-primary relative h-screen w-screen overflow-hidden"
			onClick={handleBackgroundClick}
		>
			{/* Main window */}
			<DraggableWindow windowId="main" windowCx={windowCx}>
				<MainWindow className="h-[500px]" onOpenSettings={() => windowCx.open('settings')} />
			</DraggableWindow>

			{/* Settings window */}
			<DraggableWindow windowId="settings" windowCx={windowCx}>
				<SettingsWindow />
			</DraggableWindow>
		</div>
	);
};
