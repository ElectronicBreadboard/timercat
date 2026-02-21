import { cn } from '@repo/ui';
import React from 'react';
import { TSettingsPanel } from '../types';

export const SidebarItem: React.FC<TSidebarItemProps> = (props) => {
	const { panel, icon, label, activePanel, onSelectPanel } = props;
	const isActive = activePanel === panel;

	return (
		<li className="flex">
			<button
				type="button"
				data-active={isActive || undefined}
				className={cn(
					'flex flex-1 items-center gap-2 rounded-md px-3 py-1.5 text-left text-sm select-none',
					'focus-visible:ring-primary outline-none focus-visible:ring-2',
					isActive
						? 'bg-base-100 text-base-900 ring-base-200 font-medium ring-1'
						: 'text-base-600 hover:bg-base-100 hover:text-base-900'
				)}
				onClick={() => onSelectPanel(panel)}
			>
				{icon}
				{label}
			</button>
		</li>
	);
};

interface TSidebarItemProps {
	panel: TSettingsPanel;
	icon: React.ReactNode;
	label: string;
	activePanel: TSettingsPanel;
	onSelectPanel: (panel: TSettingsPanel) => void;
}
