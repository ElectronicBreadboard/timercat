import { createFileRoute, Link, Outlet, useLocation } from '@tanstack/react-router';
import React from 'react';
import { Button, CodeIcon, TimerIcon, WindowHeader } from '@/components';
import { specta } from '@/environment';
import { SettingsCxProvider } from '@/features/settings';
import { ThemeCxProvider } from '@/features/theme';
import { TimerCxProvider } from '@/features/timer';
import { cn } from '@/lib';

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
							{/* Sidebar */}
							<aside className="border-base-200 bg-base-50 flex w-48 shrink-0 flex-col border-r">
								<nav className="flex-1 p-3">
									<ul className="space-y-0.5">
										<SidebarItem
											to="/window/settings/general"
											icon={<TimerIcon size={16} />}
											label="General"
										/>
										<SidebarItem
											to="/window/settings/developer"
											icon={<CodeIcon size={16} />}
											label="Developer"
										/>
									</ul>
								</nav>
								<div className="border-base-200 space-y-2 border-t p-3">
									<Button
										variant="danger"
										size="sm"
										className="w-full"
										onClick={() => specta.commands.quitApp()}
									>
										Quit Focuscat
									</Button>
									<p className="text-base-400 text-center text-xs">v0.1.0</p>
								</div>
							</aside>

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

// MARK: - SidebarItem

const SidebarItem: React.FC<TSidebarItemProps> = (props) => {
	const { to, icon, label } = props;
	const location = useLocation();
	const isActive = location.pathname === to;

	return (
		<li className="flex">
			<Link
				to={to}
				data-active={isActive || undefined}
				className={cn(
					'flex flex-1 items-center gap-2 rounded-md px-3 py-1.5 text-sm select-none',
					'focus-visible:ring-primary outline-none focus-visible:ring-2',
					isActive
						? 'bg-base-100 text-base-900 ring-base-200 font-medium ring-1'
						: 'text-base-600 hover:bg-base-100 hover:text-base-900'
				)}
			>
				{icon}
				{label}
			</Link>
		</li>
	);
};

interface TSidebarItemProps {
	to: string;
	icon: React.ReactNode;
	label: string;
}
