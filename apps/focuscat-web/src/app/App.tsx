import { useBoundingRectObserver } from '@repo/ui';
import React from 'react';
import { useWindowCx } from '@/features/window';
import { DraggableWindow, Fireflies } from './components';
import { CatWindow } from './windows/cat';
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
			className="relative h-screen w-screen overflow-hidden bg-[url('/illustrations/backgrounds/japanese-lofi.png')] bg-cover bg-center bg-no-repeat"
			onClick={handleBackgroundClick}
		>
			<Fireflies />

			{/* Spotify playlist (bottom-left) */}
			<div
				className="absolute bottom-4 left-4 z-10 overflow-hidden rounded-xl shadow-lg"
				data-window
			>
				<iframe
					title="Spotify playlist: beats to relax/study to"
					src="https://open.spotify.com/embed/playlist/0vvXsWCC9xrXsKd4FyS8kM"
					allow="encrypted-media"
					className="h-[152px] w-[352px] border-0"
				/>
			</div>

			{/* Main window */}
			<DraggableWindow windowId="main" windowCx={windowCx}>
				<MainWindow
					onOpenSettings={() => windowCx.open('settings')}
					onMinimize={() => {
						windowCx.open('cat');
						windowCx.close('main');
					}}
				/>
			</DraggableWindow>

			{/* Cat window */}
			<DraggableWindow windowId="cat" windowCx={windowCx} transparent>
				<CatWindow
					onExpand={() => {
						windowCx.open('main');
						windowCx.close('cat');
					}}
				/>
			</DraggableWindow>

			{/* Settings window */}
			<DraggableWindow windowId="settings" windowCx={windowCx}>
				<SettingsWindow />
			</DraggableWindow>
		</div>
	);
};
