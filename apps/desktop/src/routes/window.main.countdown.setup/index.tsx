import { createFileRoute } from '@tanstack/react-router';
import { CountdownTimerCx, SessionSetupScreen, useTimerCx } from '@/features/timer';

export const Route = createFileRoute('/window/main/countdown/setup/')({
	component: RouteComponent
});

function RouteComponent() {
	const timerCx = useTimerCx<CountdownTimerCx>();

	return (
		<SessionSetupScreen
			onStart={(intention, selectedIds) => timerCx.start(intention, selectedIds)}
			upcomingFocusSessionType="Focus"
		/>
	);
}
