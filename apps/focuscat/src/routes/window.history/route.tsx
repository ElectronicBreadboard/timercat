import { createFileRoute, Outlet } from '@tanstack/react-router';
import { unwrapOrNull } from 'tuple-result';
import { WindowHeader } from '@/components';
import { specta } from '@/environment';
import { SettingsCxProvider } from '@/features/settings';
import { ThemeCxProvider } from '@/features/theme';
import { toTuple } from '@/lib';
import { SessionList } from './components';

export const Route = createFileRoute('/window/history')({
	loader: async () => {
		// Load sessions from the last 30 days
		const now = Date.now();
		const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
		return unwrapOrNull(toTuple(await specta.commands.getSessions(thirtyDaysAgo, now, 100))) ?? [];
	},
	pendingComponent: LoadingComponent,
	component: LayoutComponent
});

function LayoutComponent() {
	const sessions = Route.useLoaderData();

	// Empty state - no sessions
	if (sessions.length === 0) {
		return (
			<SettingsCxProvider>
				<ThemeCxProvider>
					<div className="bg-base-0 flex h-screen flex-col">
						<WindowHeader title="History" />
						<div className="flex flex-1 items-center justify-center">
							<div className="text-center">
								<p className="text-base-600 text-sm font-medium">No sessions yet</p>
								<p className="text-base-400 mt-1 text-xs">
									Complete a focus session to see it here
								</p>
							</div>
						</div>
					</div>
				</ThemeCxProvider>
			</SettingsCxProvider>
		);
	}

	return (
		<SettingsCxProvider>
			<ThemeCxProvider>
				<div className="bg-base-0 flex h-screen flex-col">
					<WindowHeader title="History" />

					{/* Main Content */}
					<div className="flex flex-1 overflow-hidden">
						<SessionList sessions={sessions} className="border-base-200 w-56 shrink-0 border-r" />

						{/* Content */}
						<main className="bg-base-0 flex-1 overflow-y-auto p-4">
							<Outlet />
						</main>
					</div>
				</div>
			</ThemeCxProvider>
		</SettingsCxProvider>
	);
}

function LoadingComponent() {
	return (
		<div className="bg-base-0 flex h-screen items-center justify-center">
			<span className="text-base-400 text-sm">Loading sessions...</span>
		</div>
	);
}
