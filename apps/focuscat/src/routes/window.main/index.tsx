import { createFileRoute, useNavigate } from '@tanstack/react-router';
import React from 'react';
import { MinimizeIcon, SettingsIcon } from '@/components';
import { specta } from '@/environment';
import { Cat, TCatRef } from '@/features/cat';
import { TimerView, TodayCard } from './components';

export const Route = createFileRoute('/window/main/')({
	component: RouteComponent
});

function RouteComponent() {
	const navigate = useNavigate();
	const catRef = React.useRef<TCatRef>(null);

	// MARK: - Actions

	const handleMinimize = React.useCallback(async () => {
		await specta.commands.showCatWindow();
		await specta.commands.hideMainWindow();
	}, []);

	const handleSettings = React.useCallback(() => {
		navigate({ to: '/window/main/settings' });
	}, [navigate]);

	const handleTick = React.useCallback(() => {
		catRef.current?.tap();
	}, []);

	// MARK: - UI

	return (
		<div className="relative h-screen w-[300px] bg-white">
			{/* Header buttons */}
			<div className="absolute top-2 right-2 z-50 flex items-center gap-1">
				<button
					type="button"
					onClick={handleMinimize}
					className="flex size-6 items-center justify-center rounded-full text-neutral-300 transition-colors hover:bg-neutral-100 hover:text-neutral-500"
				>
					<MinimizeIcon size={14} />
				</button>
				<button
					type="button"
					onClick={handleSettings}
					className="flex size-6 items-center justify-center rounded-full text-neutral-300 transition-colors hover:bg-neutral-100 hover:text-neutral-500"
				>
					<SettingsIcon size={14} />
				</button>
			</div>

			{/* Today */}
			<div className="absolute top-0 left-0 z-10 h-[150px] w-[150px] border-r border-neutral-200">
				<TodayCard className="size-full" />
			</div>

			{/* Cat */}
			<div className="absolute top-0 right-0 z-40 h-[150px] w-[150px] overflow-visible">
				<Cat ref={catRef} size={150} className="absolute right-2 bottom-0" />
			</div>

			{/* Timer */}
			<TimerView onTick={handleTick} className="absolute inset-x-0 top-[150px] bottom-0" />
		</div>
	);
}
