import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/pomodoro/')({
	component: RouteComponent
});

function RouteComponent() {
	return (
		<div className="bg-base-150 h-screen flex-1 p-2">
			<div className="bg-base-50 relative h-full overflow-y-auto rounded-sm">Pomodoro Timer</div>
		</div>
	);
}
