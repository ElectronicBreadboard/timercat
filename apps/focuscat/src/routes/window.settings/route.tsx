import { createFileRoute, Link, Outlet, useLocation } from '@tanstack/react-router';
import React from 'react';
import { Button, CodeIcon, TimerIcon, WindowHeader } from '@/components';
import { specta } from '@/environment';
import { SettingsCxProvider } from '@/features/settings';
import { TimerCxProvider } from '@/features/timer';
import { cn } from '@/lib';

export const Route = createFileRoute('/window/settings')({
	component: LayoutComponent
});

function LayoutComponent() {
	return (
		<SettingsCxProvider>
			<TimerCxProvider>
				<div className="flex h-screen flex-col bg-white">
					<WindowHeader title="Settings" />

					{/* Main Content */}
					<div className="flex flex-1 overflow-hidden">
						{/* Sidebar */}
						<aside className="flex w-48 shrink-0 flex-col border-r border-gray-200 bg-gray-50">
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
							<div className="space-y-2 border-t border-gray-200 p-3">
								<Button
									variant="danger"
									size="sm"
									className="w-full"
									onClick={() => specta.commands.quitApp()}
								>
									Quit Focuscat
								</Button>
								<p className="text-center text-xs text-gray-400">v0.1.0</p>
							</div>
						</aside>

						{/* Content */}
						<main className="flex-1 overflow-y-auto bg-white p-6">
							<Outlet />
						</main>
					</div>
				</div>
			</TimerCxProvider>
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
					'outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
					isActive
						? 'bg-gray-100 font-medium text-gray-900 ring-1 ring-gray-200'
						: 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
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
