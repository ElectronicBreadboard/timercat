import { formatDuration, useTimerCx } from '@repo/ui';
import { useCombinedCompute, useCompute } from 'feature-react/state';
import React from 'react';
import { useSessionCx } from '@/features/session';
import { useSettingsCx } from '@/features/settings';

export const FocusGoalView: React.FC = () => {
	const settingsCx = useSettingsCx();
	const sessionCx = useSessionCx();
	const cx = useTimerCx();

	const baseFocusSeconds = useCompute(
		sessionCx.$sessionData,
		({ value: sessionData }) => sessionData.focusSeconds
	);
	const goalSeconds = useCompute(
		settingsCx.$appSettings,
		({ value: settings }) => settings.goals.dailyGoalMinutes * 60
	);
	const currentElapsed = useCombinedCompute(
		[cx.$sessionType, cx.$status, cx.$totalSeconds, cx.$remainingSeconds, cx.$overtimeSeconds],
		([sessionTypeCx, statusCx, totalCx, remainingCx, overtimeCx]) => {
			const sessionType = sessionTypeCx.value;
			const status = statusCx.value;
			const totalSeconds = totalCx.value;
			const remainingSeconds = remainingCx.value;
			const overtimeSeconds = overtimeCx.value;
			return sessionType === 'pomodoro:work' && status !== 'idle'
				? totalSeconds - remainingSeconds + overtimeSeconds
				: 0;
		}
	);

	const focusSeconds = baseFocusSeconds + currentElapsed;
	const progress = Math.min(focusSeconds / goalSeconds, 1);

	// MARK: - UI

	return (
		<div className="mt-2 flex flex-col gap-1">
			<span className="text-base-900 text-sm tabular-nums">
				<span className="font-semibold">{formatDuration(focusSeconds)}</span> /{' '}
				{formatDuration(goalSeconds)}
			</span>
			<div className="bg-base-200 h-1 overflow-hidden rounded-full">
				<div
					className="bg-base-900 h-full transition-[width] duration-500"
					style={{ width: `${progress * 100}%` }}
				/>
			</div>
		</div>
	);
};
