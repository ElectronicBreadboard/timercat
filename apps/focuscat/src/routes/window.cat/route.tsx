import { createFileRoute, Outlet } from '@tanstack/react-router';
import { SettingsCxProvider } from '@/features/settings';
import { ThemeCxProvider } from '@/features/theme';

export const Route = createFileRoute('/window/cat')({
	component: LayoutComponent
});

function LayoutComponent() {
	return (
		<SettingsCxProvider>
			<ThemeCxProvider>
				<Outlet />
			</ThemeCxProvider>
		</SettingsCxProvider>
	);
}
