import { createFileRoute } from '@tanstack/react-router';
import { App } from '@/app';

export const Route = createFileRoute('/app/')({
	component: RouteComponent
});

function RouteComponent() {
	return <App />;
}
