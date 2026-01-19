import React from 'react';
import { specta, type TStage } from '@/environment';

export function useAppInfo(): TAppInfo {
	const [appInfo, setAppInfo] = React.useState<TAppInfo>({
		version: 'v0.0.0',
		stage: 'prod'
	});

	React.useEffect(() => {
		(async () => {
			const info = await specta.commands.getAppInfo();
			setAppInfo({
				version: info.version,
				stage: info.stage
			});
		})();
	}, []);

	return appInfo;
}

export interface TAppInfo {
	version: string;
	stage: TStage;
}
