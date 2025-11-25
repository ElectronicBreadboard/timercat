import { LogoIcon } from '@repo/ui';
import React from 'react';

export const SidebarNav: React.FC = () => {
	return (
		<div className="bg-base-150 flex flex-col items-center justify-between">
			<div className="flex flex-col items-center p-2">
				<LogoIcon className="text-base-content h-10 w-10" />
			</div>
			<div className="flex flex-col items-center p-2">todo</div>
		</div>
	);
};
