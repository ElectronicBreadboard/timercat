import { createFileRoute } from '@tanstack/react-router';
import { specta } from '@/environment';

export const Route = createFileRoute('/window/history/$sessionId/')({
	loader: async ({ params }) => {
		const sessionId = Number(params.sessionId);

		// Load session detail
		const sessionResult = await specta.commands.getSession(sessionId);
		if (sessionResult.status !== 'ok' || sessionResult.data == null) {
			return null;
		}

		const session = sessionResult.data;

		// Load activities that overlap with the session time range
		const sessionStart = session.startedAt;
		const sessionEnd = session.endedAt ?? Math.floor(Date.now() / 1000);

		const activitiesResult = await specta.commands.getWindowActivities({
			startedAfter: sessionStart,
			startedBefore: sessionEnd,
			limit: null
		})

		let activities: specta.WindowActivityDto[] = [];
		if (activitiesResult.status === 'ok') {
			// Filter to include activities that overlap with session timeframe
			// Note: endedAt can be null for ongoing activities, treat as overlapping
			activities = activitiesResult.data.filter(
				(a) => a.startedAt < sessionEnd && (a.endedAt == null || a.endedAt > sessionStart)
			)
		}

		return { session, activities };
	},
	pendingComponent: LoadingComponent,
	component: RouteComponent
});

function RouteComponent() {
	const data = Route.useLoaderData();

	if (data == null) {
		return (
			<div className="text-base-400 flex h-full items-center justify-center text-sm">
				Session not found
			</div>
		)
	}

	return (
		<pre className="text-base-600 text-xs break-all whitespace-pre-wrap">
			{JSON.stringify(data, null, 2)}
		</pre>
	)
}

function LoadingComponent() {
	return (
		<div className="text-base-400 flex h-full items-center justify-center text-sm">
			Loading session...
		</div>
	)
}
