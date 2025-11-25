import { LogoIcon } from '@repo/ui';
import { createFileRoute, Link, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/_app')({
	component: RouteComponent
});

function RouteComponent() {
	return (
		<div className="flex min-h-screen">
			{/* App Nav Panel */}
			<div className="bg-base-150 flex flex-col items-center justify-between">
				<div className="flex flex-col items-center p-2">
					<LogoIcon className="text-base-content h-10 w-10" />
					<Link to="/pomodoro">P</Link>
					<Link to="/settings/general">S</Link>
				</div>
				<div className="flex flex-col items-center p-2">todo</div>
			</div>

			{/* App View */}
			<Outlet />
		</div>
	);
}
