import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/window/blocker')({
	component: LayoutComponent
});

function LayoutComponent() {
	return <Outlet />;
}
