import { createFileRoute, Outlet } from '@tanstack/react-router';
import { SettingsCxProvider } from '@/features/settings';

export const Route = createFileRoute('/window/cat')({
	component: LayoutComponent
});

function LayoutComponent() {
	return (
		<SettingsCxProvider>
			<Outlet />
		</SettingsCxProvider>
	);
}
