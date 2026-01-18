import { createFileRoute } from '@tanstack/react-router';
import { useFeatureState } from 'feature-react/state';
import React from 'react';
import { specta } from '@/environment';
import { Cat, catConfig, TCatRef } from '@/features/cat';
import { useSettingsCx } from '@/features/settings';
import { Navbar, StatsCard, TimerView } from './components';

export const Route = createFileRoute('/window/main/')({
	component: RouteComponent
});

function RouteComponent() {
	const catRef = React.useRef<TCatRef>(null);
	const lastTapTime = React.useRef(0);

	const settingsCx = useSettingsCx();
	const settings = useFeatureState(settingsCx.$appSettings);

	// Top section (Stats + Cat): width is half of 300px window, height lets cat overflow into timer wheel
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

	const handleSettings = React.useCallback(async () => {
		await specta.commands.showSettingsWindow();
	}, []);

	const handleTick = React.useCallback(() => {
		const now = Date.now();
		if (now - lastTapTime.current >= catConfig.tapThrottleMs) {
			lastTapTime.current = now;
			catRef.current?.tap();
		}
	}, []);

	// MARK: - UI

	return (
		<div className="bg-base-0 flex h-screen w-[300px] flex-col">
			<Navbar onMinimize={handleMinimize} onSettings={handleSettings} />

			{/* Top section: Stats + Cat */}
			<div className="flex shrink-0" style={{ height: topSection.height }}>
				<div className="border-base-200 w-1/2 border-r">
					<StatsCard className="size-full" debug={settings.debug.enabled} />
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
