import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/settings')({
	component: RouteComponent
});

function RouteComponent() {
	return (
		<>
			{/* Settings Nav Panel */}
			<div className="bg-base-200 h-screen py-2 pr-1 pl-2">
				<div className="bg-base-100 relative h-full w-48 overflow-y-auto rounded-sm">
					Settings Nav
				</div>
			</div>

			{/* Settings View */}
			<Outlet />
		</>
	);
}
