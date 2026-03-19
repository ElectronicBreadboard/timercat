import { createFileRoute } from '@tanstack/react-router';
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

	return <SessionSetupScreen timerCx={timerCx} advance={advance} />;
}
