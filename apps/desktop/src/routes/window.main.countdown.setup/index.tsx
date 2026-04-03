import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { CountdownTimerCx, SessionSetupScreen, useTimerCx } from '@/features/timer';
import {
	buildFlowReturnSearch,
	parseFlowReturnSearch,
	parseSearchBoolean,
	parseSearchNumber,
	toFlowReturnTarget,
	type TFlowReturnSearch
} from '@/lib';

export const Route = createFileRoute('/window/main/countdown/setup/')({
	validateSearch: (
		search: Record<string, unknown>
	): { createdProfileId?: number; refreshProfiles?: boolean } & TFlowReturnSearch => ({
		createdProfileId: parseSearchNumber(search['createdProfileId']),
		refreshProfiles: parseSearchBoolean(search['refreshProfiles']),
		...parseFlowReturnSearch(search)
	}),
	component: RouteComponent
});

function RouteComponent() {
	const navigate = useNavigate();
	const timerCx = useTimerCx<CountdownTimerCx>();
	const search = Route.useSearch();
	const { createdProfileId, refreshProfiles } = search;
	const returnTarget = toFlowReturnTarget(search);

	return (
		<SessionSetupScreen
			onStart={(input) => timerCx.start(input)}
			upcomingFocusSessionType="Focus"
			createdProfileId={createdProfileId}
			refreshProfiles={refreshProfiles}
			returnTarget={returnTarget}
			onRefreshHandled={() =>
				navigate({
					to: '/window/main/countdown/setup',
					search: { ...buildFlowReturnSearch(returnTarget) }
				})
			}
		/>
	);
}
