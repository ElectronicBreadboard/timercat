import { createFileRoute, Outlet } from '@tanstack/react-router';
import { AppCxProvider } from '@/app';

export const Route = createFileRoute('/app')({
	component: LayoutComponent
});

function LayoutComponent() {
	return (
		<AppCxProvider>
			<Outlet />
		</AppCxProvider>
	);
}
