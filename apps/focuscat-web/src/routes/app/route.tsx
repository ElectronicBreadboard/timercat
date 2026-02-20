import { createFileRoute, Outlet } from '@tanstack/react-router';
import { SessionCxProvider } from '@/features/session';
import { SettingsCxProvider } from '@/features/settings';
import { TimerCxProvider } from '@/features/timer';

export const Route = createFileRoute('/app')({
	component: LayoutComponent
});

function LayoutComponent() {
	return (
		<SettingsCxProvider>
			<SessionCxProvider>
				<TimerCxProvider>
					<Outlet />
				</TimerCxProvider>
			</SessionCxProvider>
		</SettingsCxProvider>
	);
}
