import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { CountdownTimerCx, SessionSetupScreen, useTimerCx } from '@/features/timer';
import { parseSearchBoolean, parseSearchNumber } from '@/lib';

export const Route = createFileRoute('/window/main/countdown/setup/')({
	validateSearch: (
		search: Record<string, unknown>
	): { createdProfileId?: number; refreshProfiles?: boolean } => ({
		createdProfileId: parseSearchNumber(search['createdProfileId']),
		refreshProfiles: parseSearchBoolean(search['refreshProfiles'])
	}),
	component: RouteComponent
});

function RouteComponent() {
	const navigate = useNavigate();
	const timerCx = useTimerCx<CountdownTimerCx>();
	const { createdProfileId, refreshProfiles } = Route.useSearch();

	return (
		<SessionSetupScreen
			onStart={(input) => timerCx.start(input)}
			upcomingFocusSessionType="Focus"
			createdProfileId={createdProfileId}
			refreshProfiles={refreshProfiles}
			onRefreshHandled={() =>
				navigate({
					to: '/window/main/countdown/setup',
					search: {}
				})
			}
		/>
	);
}
