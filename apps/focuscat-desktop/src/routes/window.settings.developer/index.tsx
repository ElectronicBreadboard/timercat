import { createFileRoute } from '@tanstack/react-router';
import { useFeatureState } from 'feature-react/state';
import React from 'react';
import { FolderOpenIcon, JsonDisplay, Switch } from '@/components';
import { specta } from '@/environment';
import { SettingGroup, SettingItem, useSettingsCx } from '@/features/settings';
import { useCurrentActivityHistory } from '@/hooks';
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

	// MARK: - Effects

	React.useEffect(() => {
		return () => {
			if (pollTimeoutRef.current != null) {
				window.clearTimeout(pollTimeoutRef.current);
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
		</div>
	);
}
