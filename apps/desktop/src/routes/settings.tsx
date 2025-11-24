import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/settings')({
	component: RouteComponent
});

function RouteComponent() {
	return <div className="bg-red-200">Hello "/settings"!</div>;
}
