import { createFileRoute, Outlet } from '@tanstack/react-router';
import { SettingsCxProvider } from '@/features/settings';
import { ThemeCxProvider } from '@/features/theme';
import { TimerCxProvider } from '@/features/timer';

export const Route = createFileRoute('/window/cat')({
	component: LayoutComponent
});

function LayoutComponent() {
	return (
		<SettingsCxProvider>
			<ThemeCxProvider>
				<TimerCxProvider>
					<Outlet />
				</TimerCxProvider>
			</ThemeCxProvider>
		</SettingsCxProvider>
	);
}
