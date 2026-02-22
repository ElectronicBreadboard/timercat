import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/sites/pomodorocat/')({
	component: RouteComponent
});

function RouteComponent() {
	return <div>Pomodorocat: Coming soon</div>;
}
