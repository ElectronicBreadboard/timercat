import { createFileRoute, useNavigate } from '@tanstack/react-router';
import React from 'react';
import { specta } from '@/environment';
import { Cat, catConfig, TCatRef } from '@/features/cat';
import { Navbar, TimerView, TodayCard } from './components';

export const Route = createFileRoute('/window/main/')({
	component: RouteComponent
});

function RouteComponent() {
	const navigate = useNavigate();
	const catRef = React.useRef<TCatRef>(null);

	// Top section (Today + Cat): width is half of 300px window, height lets cat overflow into timer wheel
	const topSection = React.useMemo(() => {
		const width = 150;
		const scaledBodyOffset = catConfig.baseBodyBottomOffset * (width / catConfig.baseSize);
		const height = Math.round(width - scaledBodyOffset);
		return { width, height };
	}, []);

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
		<div className="flex h-screen w-[300px] flex-col bg-white">
			<Navbar onMinimize={handleMinimize} onSettings={handleSettings} />

			{/* Top section: Today + Cat */}
			<div className="flex shrink-0" style={{ height: topSection.height }}>
				<div className="w-1/2 border-r border-neutral-200">
					<TodayCard className="size-full" />
				</div>
				<div className="relative z-30 w-1/2 overflow-visible">
					<Cat ref={catRef} size={topSection.width} className="absolute right-0 bottom-0" />
				</div>
			</div>

			{/* Timer */}
			<TimerView onTick={handleTick} className="flex-1" />
		</div>
	);
}
