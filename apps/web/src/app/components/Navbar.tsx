import { cn, IconButton, SettingsIcon } from '@repo/ui';
import React from 'react';

export const Navbar: React.FC<TNavbarProps> = (props) => {
	const { trafficLights = false, className } = props;

	return (
		<header
			className={cn(
				'bg-base-50 border-base-200 flex h-8 shrink-0 items-center border-b',
				className
			)}
		>
			{trafficLights && (
				<div className="flex items-center gap-1.5 pl-3">
					<div className="size-2.5 rounded-full bg-[#FF5F57]" />
					<div className="size-2.5 rounded-full bg-[#FFBD2E]" />
					<div className="size-2.5 rounded-full bg-[#28C840]" />
				</div>
			)}
			<div className="flex-1" />
			<div className="flex items-center gap-1 pr-1">
				<IconButton variant="bare" size="sm" aria-label="Open settings" className="size-7">
					<SettingsIcon size={16} />
				</IconButton>
			</div>
		</header>
	);
};

interface TNavbarProps {
	trafficLights?: boolean;
	className?: string;
}
