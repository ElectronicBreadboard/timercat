import {
	Cat,
	catConfig,
	HistoryIcon,
	IconButton,
	SettingsIcon,
	ShuffleIcon,
	TimerView,
	useTimerCx,
	type TCatFace,
	type TCatHat,
	type TCatRef
} from '@repo/ui';
import { useFeatureState } from 'feature-react/state';
import React from 'react';
import { SettingsCxProvider, useSettingsCx } from '@/features/settings';
import { TimerCxProvider } from '@/features/timer';

export const AppDemo: React.FC = () => {
	return (
		<SettingsCxProvider>
			<TimerCxProvider>
				<AppDemoInner />
			</TimerCxProvider>
		</SettingsCxProvider>
	);
};

const AppDemoInner: React.FC = () => {
	const catRef = React.useRef<TCatRef>(null);
	const settingsCx = useSettingsCx();
	const cx = useTimerCx();

	const timerStatus = useFeatureState(cx.$status);
	const settings = useFeatureState(settingsCx.$appSettings);

	// Top section sizing (mirrors desktop)
	const topSection = React.useMemo(() => {
		const width = 150;
		const scaledBodyOffset = catConfig.baseBodyBottomOffset * (width / catConfig.baseSize);
		const height = Math.round(width - scaledBodyOffset);
		return { width, height };
	}, []);

	// MARK: - Actions

	const handleTick = React.useCallback(() => {
		catRef.current?.tap();
	}, []);

	const handleRandomize = React.useCallback(() => {
		const faces = catConfig.parts.face.available;
		const hats: (TCatHat | null)[] = [...catConfig.parts.hat.available, null]; // Add null to allow for no hat
		const currentFace = settings.cat.equippedFace;
		const currentHat = settings.cat.equippedHat;

		// Randomize face and hat until they are different from the current one
		let nextFace: TCatFace = currentFace;
		let nextHat: TCatHat | null = currentHat;
		while (nextFace === currentFace && nextHat === currentHat) {
			nextFace = faces[Math.floor(Math.random() * faces.length)] as TCatFace;
			nextHat = hats[Math.floor(Math.random() * hats.length)] ?? null;
		}

		settingsCx.update({
			cat: {
				equippedFur: settings.cat.equippedFur,
				equippedFace: nextFace,
				equippedHat: nextHat
			}
		});
	}, [settingsCx, settings.cat]);

	const handleCatTap = React.useCallback(() => {
		cx.playSound?.('meow');
		return timerStatus === 'running' ? { mode: 'both' as const } : undefined;
	}, [timerStatus, cx]);

	// MARK: - UI

	return (
		<div className="bg-base-0 border-base-200 flex h-[500px] w-[300px] flex-col overflow-hidden rounded-2xl border shadow-2xl">
			{/* Window header */}
			<header className="bg-base-50 border-base-200 flex h-8 shrink-0 items-center border-b pl-3">
				<div className="flex items-center gap-1.5">
					<div className="size-2.5 rounded-full bg-[#FF5F57]" />
					<div className="size-2.5 rounded-full bg-[#FFBD2E]" />
					<div className="size-2.5 rounded-full bg-[#28C840]" />
				</div>
				<div className="flex-1" />
				<div className="flex items-center gap-1 pr-1">
					<div className="text-base-400 flex size-7 items-center justify-center">
						<HistoryIcon size={16} />
					</div>
					<div className="text-base-400 flex size-7 items-center justify-center">
						<SettingsIcon size={16} />
					</div>
				</div>
			</header>

			{/* Top section: Overview placeholder + Cat */}
			<div className="flex shrink-0" style={{ height: topSection.height }}>
				<div className="border-base-200 flex w-1/2 flex-col border-r px-3 pt-2 pb-3">
					<p className="text-base-400 text-[10px] font-medium tracking-wider uppercase">
						Focus Goal
					</p>
					<p className="text-base-800 mt-1.5 text-xs leading-snug">Building focuscat</p>
				</div>
				<div className="relative z-30 w-1/2 overflow-visible">
					<Cat
						ref={catRef}
						fur={settings.cat.equippedFur}
						face={settings.cat.equippedFace}
						hat={settings.cat.equippedHat}
						size={topSection.width}
						className="absolute right-0 bottom-0"
						onTap={handleCatTap}
					/>
					<IconButton
						variant="bare"
						size="sm"
						className="absolute top-2.5 right-3 z-40 size-3"
						onClick={handleRandomize}
					>
						<ShuffleIcon size={16} />
					</IconButton>
				</div>
			</div>

			{/* Timer */}
			<TimerView
				cx={cx}
				timerMode="pomodoro"
				sessionsBeforeLongBreak={settings.timer.pomodoro.sessionsBeforeLongBreak}
				onTick={handleTick}
				className="flex-1"
			/>
		</div>
	);
};
