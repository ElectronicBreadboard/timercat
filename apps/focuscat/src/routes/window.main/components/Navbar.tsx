import React from 'react';
import { IconButton, MinimizeIcon, SettingsIcon, WindowHeader } from '@/components';

export const Navbar: React.FC<TNavbarProps> = (props) => {
	const { onMinimize, onSettings, className } = props;

	return (
		<WindowHeader className={className}>
			<IconButton
				variant="bare"
				size="sm"
				onClick={onMinimize}
				aria-label="Minimize to cat widget"
				className="size-7"
			>
				<MinimizeIcon size={16} />
			</IconButton>
			<IconButton
				variant="bare"
				size="sm"
				onClick={onSettings}
				aria-label="Open settings"
				className="size-7"
			>
				<SettingsIcon size={16} />
			</IconButton>
		</WindowHeader>
	);
};

interface TNavbarProps {
	onMinimize: () => void;
	onSettings: () => void;
	className?: string;
}
