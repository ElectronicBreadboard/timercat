import { createFileRoute } from '@tanstack/react-router';
import { useCompute } from 'feature-react/state';
import { PomodoroTimerCx, SessionSetupScreen, useTimerCx } from '@/features/timer';

export const Route = createFileRoute('/window/main/pomodoro/setup/')({
	validateSearch: (search: Record<string, unknown>): { advance: boolean } => ({
		advance: search['advance'] === true
	}),
	component: RouteComponent
});

function RouteComponent() {
	const timerCx = useTimerCx<PomodoroTimerCx>();
	const { advance } = Route.useSearch();
	const upcomingFocusSessionType = useCompute(
		timerCx.$sessionType,
		({ value }) => (advance && value.endsWith(':work') ? 'Break' : 'Focus'),
		[advance]
	);

	return (
		<SessionSetupScreen
			onStart={(intention, selectedIds) =>
				advance ? timerCx.advance(intention, selectedIds) : timerCx.start(intention, selectedIds)
			}
			upcomingFocusSessionType={upcomingFocusSessionType}
		/>
	);
}
