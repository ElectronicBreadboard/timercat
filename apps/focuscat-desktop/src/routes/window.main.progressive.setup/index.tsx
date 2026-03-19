import { createFileRoute } from '@tanstack/react-router';
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

	return <SessionSetupScreen timerCx={timerCx} advance={advance} />;
}
