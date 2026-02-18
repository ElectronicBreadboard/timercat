import { cn } from '@repo/ui';
import { Link, useLocation } from '@tanstack/react-router';
import React from 'react';

export const SidebarItem: React.FC<TSidebarItemProps> = (props) => {
	const { to, icon, label, disabled } = props;
	const location = useLocation();
	const isActive = React.useMemo(
		() => location.pathname === to || location.pathname.startsWith(`${to}/`),
		[location.pathname, to]
	);

	return (
		<li className="flex">
			{disabled ? (
				<span
					data-active={isActive || undefined}
					className={cn(
						'flex flex-1 cursor-not-allowed items-center gap-2 rounded-md px-3 py-1.5 text-sm opacity-50 select-none',
						isActive
							? 'bg-base-100 text-base-900 ring-base-200 font-medium ring-1'
							: 'text-base-600'
					)}
				>
					{icon}
					{label}
				</span>
			) : (
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
			)}
		</li>
	);
};

interface TSidebarItemProps {
	to: string;
	icon: React.ReactNode;
	label: string;
	disabled?: boolean;
}
