import { createFileRoute, Outlet } from '@tanstack/react-router';
import { ThemeProvider, WindowHeader } from '@/components';
import { SettingsCxProvider } from '@/features/settings';
import { TimerCxProvider } from '@/features/timer';
import { Sidebar } from './components';

export const Route = createFileRoute('/window/settings')({
	component: LayoutComponent
});

function LayoutComponent() {
	return (
		<SettingsCxProvider>
			<TimerCxProvider>
				<ThemeProvider>
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
				</ThemeProvider>
			</TimerCxProvider>
		</SettingsCxProvider>
	);
}
