import { createFileRoute, Outlet } from '@tanstack/react-router';
import { ThemeProvider } from '@/components';
import { SettingsCxProvider } from '@/features/settings';

export const Route = createFileRoute('/window/blocker')({
	component: LayoutComponent
});

function LayoutComponent() {
	return (
		<SettingsCxProvider>
			<ThemeProvider>
				<Outlet />
			</ThemeProvider>
		</SettingsCxProvider>
	);
}
