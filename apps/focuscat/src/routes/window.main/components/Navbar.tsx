import React from 'react';
import { HistoryIcon, IconButton, MinimizeIcon, SettingsIcon, WindowHeader } from '@/components';

export const Navbar: React.FC<TNavbarProps> = (props) => {
	const { onMinimize, onHistory, onSettings, showHistory = true, showMinimize = true, className } =
		props;

	return (
		<WindowHeader className={className}>
			{showMinimize && (
				<IconButton
					variant="bare"
					size="sm"
					onClick={onMinimize}
					aria-label="Minimize to cat widget"
					className="size-7"
				>
					<MinimizeIcon size={16} />
				</IconButton>
			)}
			<div className="flex-1" />
			{showHistory && (
				<IconButton
					variant="bare"
					size="sm"
					onClick={onHistory}
					aria-label="View history"
					className="size-7"
				>
					<HistoryIcon size={16} />
				</IconButton>
			)}
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
	onHistory: () => void;
	onSettings: () => void;
	showHistory?: boolean;
	showMinimize?: boolean;
	className?: string;
}
