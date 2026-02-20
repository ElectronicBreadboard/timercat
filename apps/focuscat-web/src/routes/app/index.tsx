import { createFileRoute } from '@tanstack/react-router';
import { MainWindow } from '@/app';

export const Route = createFileRoute('/app/')({
	component: RouteComponent
});

function RouteComponent() {
	return (
		<div className="flex min-h-screen items-center justify-center">
			<MainWindow className="h-[500px]" />
		</div>
	);
}
