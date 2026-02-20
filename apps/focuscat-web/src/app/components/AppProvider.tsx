import React from 'react';
import { AudioCxProvider } from '@/features/audio';
import { SessionCxProvider } from '@/features/session';
import { SettingsCxProvider } from '@/features/settings';
import { TimerCxProvider } from '@/features/timer';
import { ThemeProvider } from './ThemeProvider';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	return (
		<SettingsCxProvider>
			<AudioCxProvider>
				<SessionCxProvider>
					<TimerCxProvider>
						<ThemeProvider>{children}</ThemeProvider>
					</TimerCxProvider>
				</SessionCxProvider>
			</AudioCxProvider>
		</SettingsCxProvider>
	);
};
