import { useCompute } from 'feature-react/state';
import React from 'react';
import type { WindowCx } from '@/features/window';
import { CatWindow } from '../windows/cat';
import { DiscordWindow } from '../windows/discord';
import { MacosWindow } from '../windows/macos';
import { MainWindow } from '../windows/main';
import { SettingsWindow } from '../windows/settings';
import { SpotifyWindow } from '../windows/spotify';
import { DraggableWindow } from './DraggableWindow';

export const WindowCanvas: React.FC<TWindowCanvasProps> = (props) => {
	const { windowCx } = props;
	const showWidgets = useCompute(windowCx.$breakpoint, ({ value }) => value !== 'sm');

	return (
		<>
			<DraggableWindow windowId="main" windowCx={windowCx}>
				<MainWindow
					onOpenSettings={() => {
						windowCx.open('settings');
						windowCx.close('main');
					}}
					onOpenCat={() => {
						windowCx.open('cat');
						windowCx.close('main');
					}}
				/>
			</DraggableWindow>

			<DraggableWindow windowId="cat" windowCx={windowCx} transparent>
				<CatWindow
					onExpand={() => {
						windowCx.open('main');
						windowCx.close('cat');
					}}
				/>
			</DraggableWindow>

			<DraggableWindow
				windowId="settings"
				windowCx={windowCx}
				onClose={() => windowCx.open('main')}
			>
				<SettingsWindow />
			</DraggableWindow>

			{showWidgets && (
				<>
					<DraggableWindow windowId="spotify" windowCx={windowCx} transparent>
						<SpotifyWindow />
					</DraggableWindow>
					<DraggableWindow windowId="discord" windowCx={windowCx} transparent>
						<DiscordWindow />
					</DraggableWindow>
					<DraggableWindow windowId="macos" windowCx={windowCx} transparent>
						<MacosWindow />
					</DraggableWindow>
				</>
			)}
		</>
	);
};

export interface TWindowCanvasProps {
	windowCx: WindowCx;
}
