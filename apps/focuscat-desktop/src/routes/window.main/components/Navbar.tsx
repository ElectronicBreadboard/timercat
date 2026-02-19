import { HistoryIcon, IconButton, MinimizeIcon, SettingsIcon } from '@repo/ui';
import React from 'react';
import { WindowHeader } from '@/components';

export const Navbar: React.FC<TNavbarProps> = (props) => {
	const {
		onMinimize,
		onActivity,
		onSettings,
		showActivity = true,
		showSettings = true,
		showMinimize = true,
		className
	} = props;

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
			{showActivity && (
				<IconButton
					variant="bare"
					size="sm"
					onClick={onActivity}
					aria-label="View activity"
					className="size-7"
				>
					<HistoryIcon size={16} />
				</IconButton>
			)}
			{showSettings && (
				<IconButton
					variant="bare"
					size="sm"
					onClick={onSettings}
					aria-label="Open settings"
					className="size-7"
				>
					<SettingsIcon size={16} />
				</IconButton>
			)}
		</WindowHeader>
	);
};

interface TNavbarProps {
	onMinimize: () => void;
	onActivity: () => void;
	onSettings: () => void;
	showActivity?: boolean;
	showSettings?: boolean;
	showMinimize?: boolean;
	className?: string;
}
