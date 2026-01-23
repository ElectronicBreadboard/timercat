import { createFileRoute, redirect } from '@tanstack/react-router';
import { specta } from '@/environment';
import { toTuple } from '@/lib';

export const Route = createFileRoute('/window/history/')({
	loader: async () => {
		// Auto-select latest session if available
		const [isOk, , session] = toTuple(await specta.commands.getLastWorkSession(30));
		if (isOk && session != null) {
			throw redirect({ to: '/window/history/$sessionId', params: { sessionId: String(session.id) } });
		}
		return null;
	},
	component: RouteComponent
});

function RouteComponent() {
	return (
		<div className="text-base-400 flex h-full items-center justify-center text-sm">
			No sessions yet
		</div>
	);
}
