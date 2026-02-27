import { formatDuration, formatRelativeDate } from '@repo/ui';
import React from 'react';
import { specta } from '@/environment';
import { useOnSessionComplete } from '@/hooks';
import { toTuple } from '@/lib';

export const LastSessionView: React.FC<TLastSessionViewProps> = (props) => {
	const { minSessionDurationSecs = 30 } = props;
	const [lastSession, setLastSession] = React.useState<specta.SessionDetailDto | null>(null);

	// MARK: - Actions

	const fetchData = React.useCallback(async () => {
		const [isSessionOk, , session] = toTuple(
			await specta.commands.getLastWorkSession(minSessionDurationSecs)
		);
		if (isSessionOk) {
			setLastSession(session);
		}
	}, [minSessionDurationSecs]);

	const handleNavigate = React.useCallback(async () => {
		if (lastSession == null) {
			return;
		}
		await specta.commands.showActivityWindowAtSession(lastSession.id);
	}, [lastSession]);

	// MARK: - Effects

	React.useEffect(() => {
		fetchData();
	}, [fetchData]);

	useOnSessionComplete(React.useCallback(() => fetchData(), [fetchData]));

	// MARK: - UI

	if (lastSession == null) {
		return (
			<div className="mt-2 flex flex-col gap-1">
				<span className="text-base-400 text-sm">No session yet</span>
			</div>
		);
	}

	const completedSeconds = lastSession.actualSeconds ?? lastSession.plannedSeconds;
	const sessionDate = formatRelativeDate(new Date(lastSession.startedAt));

	return (
		<button type="button" onClick={handleNavigate} className="mt-2 flex flex-col gap-1 text-left">
			{/* Duration */}
			<span className="text-base-900 text-sm font-semibold tabular-nums">
				{formatDuration(completedSeconds)}
			</span>

			{/* Status + Date */}
			<div className="text-base-400 text-[10px]">
				{lastSession.stats.overtimeSeconds > 0 ? (
					<>
						<span className="text-warning">
							+{formatDuration(lastSession.stats.overtimeSeconds)} overtime
						</span>
						<span> · {sessionDate}</span>
					</>
				) : (
					<span>{sessionDate}</span>
				)}
			</div>
		</button>
	);
};

interface TLastSessionViewProps {
	minSessionDurationSecs?: number;
}
