import React from 'react';
import { specta } from '@/environment';
import { useOnSessionComplete } from '@/hooks';
import { formatDuration, formatRelativeDate, toTuple } from '@/lib';

export const LastSessionView: React.FC = () => {
	const [lastSession, setLastSession] = React.useState<specta.SessionDetailDto | null>(null);

	// MARK: - Actions

	const fetchData = React.useCallback(async () => {
		const [isSessionOk, , session] = toTuple(
			// Note: Use same min duration as session list (30s) for consistency
			await specta.commands.getLastWorkSession(30)
		);
		if (isSessionOk) {
			setLastSession(session);
		}
	}, []);

	const handleNavigate = React.useCallback(async () => {
		if (lastSession == null) {
			return;
		}
		await specta.commands.showHistoryWindowAtSession(lastSession.id);
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
