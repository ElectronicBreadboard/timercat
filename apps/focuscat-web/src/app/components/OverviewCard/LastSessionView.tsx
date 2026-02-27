import { formatDuration, formatRelativeDate } from '@repo/ui';
import React from 'react';
import { useSessionCx, type TSessionRow } from '@/features/session';
import { useWindowCx } from '@/features/window';

export const LastSessionView: React.FC<TLastSessionViewProps> = (props) => {
	const { minSessionDurationSecs = 30 } = props;
	const sessionCx = useSessionCx();
	const windowCx = useWindowCx();
	const [lastSession, setLastSession] = React.useState<TSessionRow | null>(null);

	// MARK: - Actions

	const fetchData = React.useCallback(async () => {
		const session = await sessionCx.getLastWorkSession(minSessionDurationSecs);
		if (session != null) {
			setLastSession(session);
		}
	}, [sessionCx, minSessionDurationSecs]);

	const handleOpenActivity = React.useCallback(() => {
		windowCx.open('activity');
		windowCx.close('main');
	}, [windowCx]);

	// MARK: - Effects

	React.useEffect(() => {
		fetchData();
	}, [fetchData]);

	React.useEffect(() => {
		const unregister = sessionCx.registerSessionComplete(fetchData);
		return () => unregister();
	}, [sessionCx, fetchData]);

	// MARK: - UI

	if (lastSession == null) {
		return (
			<div className="mt-2 flex flex-col gap-1">
				<span className="text-base-400 text-sm">No session yet</span>
			</div>
		);
	}

	const completedSeconds = lastSession.actual_seconds ?? lastSession.planned_seconds;
	const sessionDate = formatRelativeDate(new Date(lastSession.started_at));
	const stats = sessionCx.computeSessionStats(lastSession);

	return (
		<button
			type="button"
			onClick={handleOpenActivity}
			className="mt-2 flex flex-col gap-1 text-left"
		>
			{/* Duration */}
			<span className="text-base-900 text-sm font-semibold tabular-nums">
				{formatDuration(completedSeconds)}
			</span>

			{/* Status + Date */}
			<div className="text-base-400 text-[10px]">
				{stats.overtimeSeconds > 0 ? (
					<>
						<span className="text-warning">+{formatDuration(stats.overtimeSeconds)} overtime</span>
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
