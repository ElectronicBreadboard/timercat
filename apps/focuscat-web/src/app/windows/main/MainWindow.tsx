import {
	Cat,
	catConfig,
	cn,
	IconButton,
	MinimizeIcon,
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
import { OverviewCard, WindowHeader } from '@/app';
import { useAudioCx } from '@/features/audio';
import { useSettingsCx } from '@/features/settings';

export const MainWindow: React.FC<TMainWindowProps> = (props) => {
	const { className, onOpenSettings, onMinimize, standalone = false } = props;
	const catRef = React.useRef<TCatRef>(null);

	const settingsCx = useSettingsCx();
	const settings = useFeatureState(settingsCx.$appSettings);

	const timerCx = useTimerCx();
	const timerStatus = useFeatureState(timerCx.$status);

	const audioCx = useAudioCx();

	// Top section (Stats + Cat): width is half of 300px window, height lets cat overflow into timer wheel
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
		const hats: (TCatHat | null)[] = [...catConfig.parts.hat.available, null];
		const currentFace = settings.cat.equippedFace;
		const currentHat = settings.cat.equippedHat;

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
		audioCx.playSound('meow');
		return timerStatus === 'running' ? { mode: 'both' as const } : undefined;
	}, [audioCx, timerStatus]);

	// MARK: - UI

	return (
		<div className={cn('bg-base-0 flex h-full flex-col', className)}>
			<WindowHeader decorativeTrafficLights={standalone}>
				{settings.features.catWindow && onMinimize != null ? (
					<IconButton
						variant="bare"
						size="sm"
						aria-label="Minimize to cat widget"
						className="size-7"
						onClick={onMinimize}
					>
						<MinimizeIcon size={16} />
					</IconButton>
				) : null}
				{onOpenSettings != null ? (
					<IconButton
						variant="bare"
						size="sm"
						aria-label="Open settings"
						className="size-7"
						onClick={onOpenSettings}
					>
						<SettingsIcon size={16} />
					</IconButton>
				) : null}
			</WindowHeader>

			{/* Top section: Overview + Cat */}
			<div className="flex shrink-0" style={{ height: topSection.height }}>
				<div className="border-base-200 w-1/2 border-r">
					<OverviewCard className="size-full" />
				</div>
				<div className="relative z-30 w-1/2 overflow-visible">
					<Cat
						ref={catRef}
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
				cx={timerCx}
				timerMode={settings.timer.timerMode}
				sessionsBeforeLongBreak={settings.timer.pomodoro.sessionsBeforeLongBreak}
				showDevSpeed={settings.features.developer}
				onTick={handleTick}
				className="flex-1"
			/>
		</div>
	);
};

interface TMainWindowProps {
	className?: string;
	onOpenSettings?: () => void;
	onMinimize?: () => void;
	standalone?: boolean;
}
