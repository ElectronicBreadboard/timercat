import React from 'react';
import { specta } from '@/environment';

export function useAppInfo(): TAppInfo {
	const [appInfo, setAppInfo] = React.useState<TAppInfo>({
		version: 'v0.0.0',
		stage: 'prod',
		distribution: 'direct'
	});

	React.useEffect(() => {
		(async () => {
			const info = await specta.commands.getAppInfo();
			setAppInfo({
				version: info.version,
				stage: info.stage,
				distribution: info.distribution
			});
		})();
	}, []);

	return appInfo;
}

export interface TAppInfo {
	version: string;
	stage: specta.Stage;
	distribution: specta.AppDistribution;
}
