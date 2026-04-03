import { createFileRoute } from '@tanstack/react-router';
import { useCompute } from 'feature-react/state';
import { ProgressivePomodoroTimerCx, SessionSetupScreen, useTimerCx } from '@/features/timer';

export const Route = createFileRoute('/window/main/progressive/setup/')({
	validateSearch: (search: Record<string, unknown>): { advance: boolean } => ({
		advance: search['advance'] === true
	}),
	component: RouteComponent
});

function RouteComponent() {
	const timerCx = useTimerCx<ProgressivePomodoroTimerCx>();
	const { advance } = Route.useSearch();
	const upcomingFocusSessionType = useCompute(
		timerCx.$sessionType,
		({ value }) => (advance && value.endsWith(':work') ? 'Break' : 'Focus'),
		[advance]
	);

	return (
		<SessionSetupScreen
			onStart={(input) => (advance ? timerCx.advance(input) : timerCx.start(input))}
			upcomingFocusSessionType={upcomingFocusSessionType}
		/>
	);
}
