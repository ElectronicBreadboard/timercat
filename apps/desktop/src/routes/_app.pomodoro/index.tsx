import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/pomodoro/')({
	component: RouteComponent,
	loader: async () => {
		return {
			message: 'Pomodoro Timer'
		};
	}
});

function RouteComponent() {
	const { message } = Route.useLoaderData();

	return (
		<div className="bg-base-150 h-screen p-2">
			<div className="relative h-full overflow-y-auto rounded-sm bg-white">Pomodoro Timer</div>
		</div>
	);
}
