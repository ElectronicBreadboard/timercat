import { createFileRoute, Outlet } from '@tanstack/react-router';
import { SidebarNav } from './-components';

export const Route = createFileRoute('/_app')({
	component: RouteComponent
});

function RouteComponent() {
	return (
		<div className="flex min-h-screen bg-green-200">
			<SidebarNav />
			<main className="flex-1 overflow-auto">
				<Outlet />
			</main>
		</div>
	);
}
