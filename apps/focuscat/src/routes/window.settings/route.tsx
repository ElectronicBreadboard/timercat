import { createFileRoute, Outlet } from '@tanstack/react-router';
import { WindowHeader } from '@/components';
import { SettingsCxProvider } from '@/features/settings';
import { ThemeCxProvider } from '@/features/theme';
import { TimerCxProvider } from '@/features/timer';
import { Sidebar } from './components';

export const Route = createFileRoute('/window/settings')({
	component: LayoutComponent
});

function LayoutComponent() {
	return (
		<SettingsCxProvider>
			<ThemeCxProvider>
				<TimerCxProvider>
					<div className="bg-base-0 flex h-screen flex-col">
						<WindowHeader title="Settings" />

						{/* Main Content */}
						<div className="flex flex-1 overflow-hidden">
							<Sidebar />

							{/* Content */}
							<main className="bg-base-0 flex-1 overflow-y-auto p-6">
								<Outlet />
							</main>
						</div>
					</div>
				</TimerCxProvider>
			</ThemeCxProvider>
		</SettingsCxProvider>
	);
}
