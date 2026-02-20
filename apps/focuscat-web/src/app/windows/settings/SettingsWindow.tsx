import React from 'react';
import { WindowHeader } from '@/app/components';

export const SettingsWindow: React.FC = () => {
	return (
		<div className="bg-base-0 flex h-[450px] w-[600px] flex-col">
			<WindowHeader title="Settings" />

			<div className="flex flex-1 items-center justify-center">
				<p className="text-base-400 text-sm">Settings — TODO</p>
			</div>
		</div>
	);
};
