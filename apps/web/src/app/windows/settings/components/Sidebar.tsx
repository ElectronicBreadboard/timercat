import { AppWindowIcon, Button, CodeIcon, InfoIcon, TargetIcon, TimerIcon } from '@repo/ui';
import { useFeatureState } from 'feature-react/state';
import React from 'react';
import { appConfig } from '@/environment';
import { useSettingsCx } from '@/features/settings';
import { TSettingsPanel } from '../types';
import { SidebarItem } from './SidebarItem';

export const Sidebar: React.FC<TSidebarProps> = (props) => {
	const { activePanel, onSelectPanel, isMobile } = props;
	const settingsCx = useSettingsCx();
	const settings = useFeatureState(settingsCx.$appSettings);

	const items = (
		<>
			<SidebarItem
				panel="app"
				icon={<AppWindowIcon size={16} />}
				label="App"
				activePanel={activePanel}
				onSelectPanel={onSelectPanel}
			/>
			<SidebarItem
				panel="timer"
				icon={<TimerIcon size={16} />}
				label="Timer"
				activePanel={activePanel}
				onSelectPanel={onSelectPanel}
			/>
			{settings.features.goals && (
				<SidebarItem
					panel="goals"
					icon={<TargetIcon size={16} />}
					label="Goals"
					activePanel={activePanel}
					onSelectPanel={onSelectPanel}
				/>
			)}
			<SidebarItem
				panel="about"
				icon={<InfoIcon size={16} />}
				label="About"
				activePanel={activePanel}
				onSelectPanel={onSelectPanel}
			/>
			{settings.features.developer && (
				<SidebarItem
					panel="developer"
					icon={<CodeIcon size={16} />}
					label="Developer"
					activePanel={activePanel}
					onSelectPanel={onSelectPanel}
				/>
			)}
		</>
	);

	if (isMobile) {
		return (
			<nav className="border-base-200 bg-base-50 shrink-0 overflow-x-auto border-b">
				<ul className="flex gap-1 p-2">{items}</ul>
			</nav>
		);
	}

	return (
		<aside className="border-base-200 bg-base-50 flex w-40 shrink-0 flex-col border-r">
			<nav className="flex-1 p-3">
				<ul className="space-y-0.5">{items}</ul>
			</nav>
			<div className="border-base-200 space-y-2 border-t p-3">
				<Button
					variant="default"
					size="sm"
					className="w-full border-purple-500/30 bg-purple-500/10 text-purple-600 hover:bg-purple-500/20 focus-visible:ring-purple-500 active:bg-purple-500/30"
					render={
						<a href={appConfig.distribution.website} target="_blank" rel="noopener noreferrer" />
					}
					nativeButton={false}
				>
					Get FocusCat
				</Button>
				<p className="text-base-400 text-center text-xs">{appConfig.version}</p>
			</div>
		</aside>
	);
};

interface TSidebarProps {
	activePanel: TSettingsPanel;
	onSelectPanel: (panel: TSettingsPanel) => void;
	isMobile: boolean;
}
