import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/settings/general/')({
	component: RouteComponent
});

function RouteComponent() {
	return (
		<div className="bg-base-150 h-screen flex-1 py-2 pr-2 pl-1">
			<div className="relative h-full overflow-y-auto rounded-sm bg-white">Settings</div>
		</div>
	);
}
