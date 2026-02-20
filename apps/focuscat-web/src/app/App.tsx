import React from 'react';
import { useWindowCx, WindowCxProvider } from '@/features/window';
import { DraggableWindow } from './components';
import { MainWindow } from './windows/main';
import { SettingsWindow } from './windows/settings';

const AppInner: React.FC = () => {
	const windowCx = useWindowCx();

	const handleBackgroundClick = React.useCallback(
		(e: React.MouseEvent<HTMLDivElement>) => {
			if ((e.target as HTMLElement).closest('[data-window]') == null) {
				windowCx.clearFocus();
			}
		},
		[windowCx]
	);

	return (
		<div
			className="relative h-screen w-screen overflow-hidden bg-blue-950"
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

export const App: React.FC = () => {
	return (
		<WindowCxProvider>
			<AppInner />
		</WindowCxProvider>
	);
};
