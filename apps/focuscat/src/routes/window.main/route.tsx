import { createFileRoute, Outlet } from '@tanstack/react-router';
import { SettingsCxProvider } from '@/features/settings';
import { TimerCxProvider } from '@/features/timer';

export const Route = createFileRoute('/window/main')({
	component: LayoutComponent
});

function LayoutComponent() {
	return (
		<SettingsCxProvider>
			<TimerCxProvider>
				<Outlet />
			</TimerCxProvider>
		</SettingsCxProvider>
	);
}
