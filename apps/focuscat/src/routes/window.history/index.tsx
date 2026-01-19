import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/window/history/')({
	component: RouteComponent
});

function RouteComponent() {
	return (
		<div className="text-base-400 flex h-full items-center justify-center text-sm">
			Select a session to view details
		</div>
	);
}
