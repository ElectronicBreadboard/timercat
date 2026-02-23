import React from 'react';
import type { WindowCx } from '@/features/window';
import { CatWindow } from '../windows/cat';
import { MainWindow } from '../windows/main';
import { SettingsWindow } from '../windows/settings';
import { DraggableWindow } from './DraggableWindow';

export const WindowCanvas: React.FC<TWindowCanvasProps> = (props) => {
	const { windowCx } = props;

	return (
		<>
			<DraggableWindow windowId="main" windowCx={windowCx}>
				<MainWindow
					onOpenSettings={() => windowCx.open('settings')}
					onMinimize={() => {
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

			<DraggableWindow windowId="settings" windowCx={windowCx}>
				<SettingsWindow />
			</DraggableWindow>
		</>
	);
};

export interface TWindowCanvasProps {
	windowCx: WindowCx;
}
