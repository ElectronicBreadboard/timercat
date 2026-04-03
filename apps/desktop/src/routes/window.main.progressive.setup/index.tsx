import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useCompute } from 'feature-react/state';
import { ProgressivePomodoroTimerCx, SessionSetupScreen, useTimerCx } from '@/features/timer';
import { parseSearchBoolean, parseSearchNumber } from '@/lib';

export const Route = createFileRoute('/window/main/progressive/setup/')({
	validateSearch: (
		search: Record<string, unknown>
	): { advance: boolean; createdProfileId?: number; refreshProfiles?: boolean } => ({
		advance: parseSearchBoolean(search['advance']),
		createdProfileId: parseSearchNumber(search['createdProfileId']),
		refreshProfiles: parseSearchBoolean(search['refreshProfiles'])
	}),
	component: RouteComponent
});

function RouteComponent() {
	const navigate = useNavigate();
	const timerCx = useTimerCx<ProgressivePomodoroTimerCx>();
	const { advance, createdProfileId, refreshProfiles } = Route.useSearch();
	const upcomingFocusSessionType = useCompute(
		timerCx.$sessionType,
		({ value }) => (advance && value.endsWith(':work') ? 'Break' : 'Focus'),
		[advance]
	);

	return (
		<SessionSetupScreen
			onStart={(input) => (advance ? timerCx.advance(input) : timerCx.start(input))}
			upcomingFocusSessionType={upcomingFocusSessionType}
			createdProfileId={createdProfileId}
			refreshProfiles={refreshProfiles}
			onRefreshHandled={() =>
				navigate({
					to: '/window/main/progressive/setup',
					search: { advance }
				})
			}
		/>
	);
}
