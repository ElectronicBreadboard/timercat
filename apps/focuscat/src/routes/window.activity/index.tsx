import { createFileRoute, redirect } from '@tanstack/react-router';
import { specta } from '@/environment';
import { toTuple } from '@/lib';
import { activitySessionConfig } from './config';

export const Route = createFileRoute('/window/activity/')({
	loader: async () => {
		const { startedAfter, startedBefore } = activitySessionConfig.activitySessionTimeRange();
		const [ok, , sessionId] = toTuple(
			await specta.commands.getMostRecentSessionId(
				startedAfter,
				startedBefore,
				activitySessionConfig.minDurationSecs
			)
		);
		if (ok && sessionId != null) {
			throw redirect({
				to: '/window/activity/$sessionId',
				params: { sessionId: String(sessionId) }
			});
		}
		throw redirect({ to: '/window/activity/overview' });
	}
});
