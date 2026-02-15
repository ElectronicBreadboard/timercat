import { createFileRoute } from '@tanstack/react-router';
import { useFeatureState } from 'feature-react/state';
import React from 'react';
import { FolderOpenIcon, JsonDisplay, Switch } from '@/components';
import { specta } from '@/environment';
import { SettingGroup, SettingItem, useSettingsCx } from '@/features/settings';
import { useCurrentActivityHistory, useOnInputDetected } from '@/hooks';
import { toTuple } from '@/lib';

export const Route = createFileRoute('/window/settings/developer/')({
	component: RouteComponent
});

function RouteComponent() {
	const settingsCx = useSettingsCx();
	const settings = useFeatureState(settingsCx.$appSettings);

	const [showActivityHistory, setShowActivityHistory] = React.useState(false);
	const activityHistory = useCurrentActivityHistory({ limit: 10 });

	const [polledActivity, setPolledActivity] = React.useState<specta.CurrentActivityDto | null>(
		null
	);
	const [pollError, setPollError] = React.useState<string | null>(null);
	const [isPolling, setIsPolling] = React.useState(false);
	const pollTimeoutRef = React.useRef<number | null>(null);

	const keyboardDotRef = React.useRef<HTMLSpanElement>(null);
	const mouseDotRef = React.useRef<HTMLSpanElement>(null);
	const inputFlashTimeoutRef = React.useRef<number | null>(null);

	// MARK: - Actions

	const updateDeveloper = React.useCallback(
		(updates: Partial<specta.DeveloperSettings>) => {
			settingsCx.update({ developer: { ...settings.developer, ...updates } });
		},
		[settingsCx, settings.developer]
	);

	const cycleTimerSpeed = React.useCallback(() => {
		const speeds = [1, 2, 5, 10, 60, 120];
		const currentIndex = speeds.indexOf(settings.developer.timerSpeed);
		const nextIndex = (currentIndex + 1) % speeds.length;
		updateDeveloper({ timerSpeed: speeds[nextIndex] });
	}, [settings.developer.timerSpeed, updateDeveloper]);

	const schedulePoll = React.useCallback((pollTarget: specta.CurrentActivityPollTarget) => {
		if (pollTimeoutRef.current != null) {
			window.clearTimeout(pollTimeoutRef.current);
			pollTimeoutRef.current = null;
		}
		setPollError(null);
		setIsPolling(true);
		pollTimeoutRef.current = window.setTimeout(async () => {
			pollTimeoutRef.current = null;
			setIsPolling(false);
			const [isActivityOk, activityErr, activity] = await specta.commands
				.getCurrentActivity({ pollTarget })
				.then(toTuple);
			if (isActivityOk) {
				setPolledActivity(activity);
			} else {
				setPollError(activityErr);
				setPolledActivity(null);
			}
		}, 2000);
	}, []);

	const flashDot = React.useCallback((el: HTMLSpanElement | null, color: string) => {
		if (el == null) {
			return;
		}
		el.style.backgroundColor = color;
		el.style.boxShadow = `0 0 8px ${color}`;
	}, []);

	const clearDot = React.useCallback((el: HTMLSpanElement | null) => {
		if (el == null) {
			return;
		}
		el.style.backgroundColor = '';
		el.style.boxShadow = '';
	}, []);

	// MARK: - Effects

	useOnInputDetected(
		React.useCallback(
			(inputType: specta.InputType) => {
				if (inputFlashTimeoutRef.current != null) {
					window.clearTimeout(inputFlashTimeoutRef.current);
				}
				clearDot(keyboardDotRef.current);
				clearDot(mouseDotRef.current);
				if (inputType === 'keyboard') {
					flashDot(keyboardDotRef.current, 'var(--color-info)');
				} else {
					flashDot(mouseDotRef.current, 'var(--color-accent)');
				}
				inputFlashTimeoutRef.current = window.setTimeout(() => {
					inputFlashTimeoutRef.current = null;
					clearDot(inputType === 'keyboard' ? keyboardDotRef.current : mouseDotRef.current);
				}, 80);
			},
			[flashDot, clearDot]
		)
	);

	React.useEffect(() => {
		return () => {
			if (pollTimeoutRef.current != null) {
				window.clearTimeout(pollTimeoutRef.current);
			}
			if (inputFlashTimeoutRef.current != null) {
				window.clearTimeout(inputFlashTimeoutRef.current);
			}
		};
	}, []);

	// MARK: - UI

	return (
		<div className="space-y-6">
			<h1 className="text-base-900 text-xl font-semibold">Developer</h1>

			<SettingGroup title="App">
				<SettingItem
					variant="nav"
					label="Data Directory"
					description="Open app data folder in Finder"
					onClick={() => specta.commands.openDataDirectory()}
				>
					<FolderOpenIcon size={16} className="text-base-400" />
				</SettingItem>
			</SettingGroup>

			<SettingGroup title="Timer">
				<SettingItem
					variant="action"
					label="Timer Speed"
					description="Speed up timer for testing"
					onClick={cycleTimerSpeed}
				>
					<span className="text-base-500 font-mono text-sm">{settings.developer.timerSpeed}x</span>
				</SettingItem>
			</SettingGroup>

			<SettingGroup title="Cat">
				<SettingItem label="Cat debug" description="Show debug borders on cat window">
					<Switch
						checked={settings.developer.cat}
						onCheckedChange={(checked) => updateDeveloper({ cat: checked })}
						size="sm"
					/>
				</SettingItem>
			</SettingGroup>

			<SettingGroup title="Activity (polling)">
				<div className="w-full">
					{isPolling ? (
						<span className="text-base-400 p-1 text-sm">Polling…</span>
					) : polledActivity != null ? (
						<JsonDisplay data={polledActivity} className="mt-2 max-h-80" />
					) : pollError != null ? (
						<div className="text-error p-1 font-mono text-sm">{pollError}</div>
					) : (
						<span className="text-base-400 p-1 text-sm">—</span>
					)}
				</div>
				<p className="text-base-500 p-1 text-xs">
					Click{' '}
					<button
						type="button"
						className="hover:text-primary-600 text-primary-500 cursor-pointer underline"
						onClick={() => schedulePoll('app')}
					>
						poll app
					</button>
					{' or '}
					<button
						type="button"
						className="hover:text-primary-600 text-primary-500 cursor-pointer underline"
						onClick={() => schedulePoll('window')}
					>
						poll window
					</button>
					, then switch app before the poll runs (2s).
				</p>
			</SettingGroup>

			<SettingGroup title="Activity (monitoring)">
				<div className="w-full">
					{!activityHistory.length || !showActivityHistory ? (
						<span className="text-base-400 p-1 text-sm">—</span>
					) : (
						<JsonDisplay data={activityHistory} className="mt-2 max-h-80" />
					)}
				</div>
				<p className="text-base-500 p-1 text-xs">
					Window event history (newest first, max 10):{' '}
					<button
						type="button"
						className="hover:text-primary-600 text-primary-500 cursor-pointer underline"
						onClick={() => setShowActivityHistory((v) => !v)}
					>
						{showActivityHistory ? 'disable' : 'enable'}
					</button>
				</p>
			</SettingGroup>

			<SettingGroup title="Input">
				<div className="w-full px-3 py-2">
					<span className="text-base-600 inline-flex items-center gap-2 text-sm">
						<span
							ref={keyboardDotRef}
							className="bg-base-200 inline-block h-2 w-2 shrink-0 rounded-full"
							aria-hidden
						/>
						Keyboard
						<span
							ref={mouseDotRef}
							className="bg-base-200 inline-block h-2 w-2 shrink-0 rounded-full"
							aria-hidden
						/>
						Mouse
					</span>
				</div>
				<p className="text-base-500 p-1 text-xs">
					Lights flash when keyboard or mouse input is detected.
				</p>
			</SettingGroup>
		</div>
	);
}
