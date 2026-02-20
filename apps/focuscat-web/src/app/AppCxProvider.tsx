import React from 'react';
import { AudioCxProvider } from '@/features/audio';
import { SessionCxProvider } from '@/features/session';
import { SettingsCxProvider } from '@/features/settings';
import { TimerCxProvider } from '@/features/timer';

/**
 * Composes all app context providers in the correct dependency order.
 */
export const AppCxProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	return (
		<SettingsCxProvider>
			<AudioCxProvider>
				<SessionCxProvider>
					<TimerCxProvider>{children}</TimerCxProvider>
				</SessionCxProvider>
			</AudioCxProvider>
		</SettingsCxProvider>
	);
};
