import { getCurrentWindow } from '@tauri-apps/api/window';
import React from 'react';
import { MinimizeIcon, SettingsIcon } from '@/components';
import { usePlatform } from '@/hooks';
import { cn } from '@/lib';

export const Navbar: React.FC<TNavbarProps> = (props) => {
	const { onMinimize, onSettings, className } = props;
	const platform = usePlatform();

	// MARK: - Actions

	const handleDragStart = React.useCallback((e: React.PointerEvent) => {
		// Only drag on left mouse button, and not on buttons
		if (e.button === 0 && (e.target as HTMLElement).closest('button') == null) {
			getCurrentWindow().startDragging();
		}
	}, []);

	// MARK: - UI

	return (
		<header
			className={cn(
				'flex h-8 shrink-0 select-none items-center border-b border-neutral-200 bg-neutral-50 pr-3',
				platform === 'macos' ? 'pl-[70px]' : 'pl-2', // Reserve space for macOS traffic lights
				className
			)}
			onPointerDown={handleDragStart}
		>
			<div className="flex-1" />
			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={onMinimize}
					aria-label="Minimize to cat widget"
					className="text-neutral-400 transition-colors hover:text-neutral-600"
				>
					<MinimizeIcon size={16} />
				</button>
				<button
					type="button"
					onClick={onSettings}
					aria-label="Open settings"
					className="text-neutral-400 transition-colors hover:text-neutral-600"
				>
					<SettingsIcon size={16} />
				</button>
			</div>
		</header>
	);
};

interface TNavbarProps {
	onMinimize: () => void;
	onSettings: () => void;
	className?: string;
}
