import React from 'react';
import { WindowHeader } from '../../components';
import { Sidebar } from './components';
import { AppPanel, DeveloperPanel, GoalsPanel, TimerPanel } from './panels';
import type { TSettingsPanel } from './types';

export const SettingsWindow: React.FC = () => {
	const [activePanel, setActivePanel] = React.useState<TSettingsPanel>('app');

	return (
		<div className="bg-base-0 flex h-full w-full flex-col">
			<WindowHeader title="Settings" />

			<div className="flex flex-1 overflow-hidden">
				<Sidebar activePanel={activePanel} onSelectPanel={setActivePanel} />

				<main className="bg-base-0 flex-1 overflow-y-auto p-6">
					{activePanel === 'app' && <AppPanel />}
					{activePanel === 'timer' && <TimerPanel />}
					{activePanel === 'goals' && <GoalsPanel />}
					{activePanel === 'developer' && <DeveloperPanel />}
				</main>
			</div>
		</div>
	);
};
