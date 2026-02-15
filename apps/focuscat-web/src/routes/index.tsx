import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
	component: RouteComponent
});

function RouteComponent() {
	return (
		<div className="flex min-h-screen items-center justify-center">
			<p className="text-lg text-gray-500">todo</p>
		</div>
	);
}
