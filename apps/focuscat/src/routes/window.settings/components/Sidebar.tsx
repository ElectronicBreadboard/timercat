import { useFeatureState } from 'feature-react/state';
import React from 'react';
import {
	ActivityIcon,
	AppWindowIcon,
	Button,
	CodeIcon,
	TagIcon,
	TargetIcon,
	TimerIcon
} from '@/components';
import { specta } from '@/environment';
import { useSettingsCx } from '@/features/settings';
import { useAppInfo } from '@/hooks';
import { SidebarItem } from './SidebarItem';

export const Sidebar: React.FC = () => {
	const settingsCx = useSettingsCx();
	const settings = useFeatureState(settingsCx.$appSettings);
	const appInfo = useAppInfo();

	return (
		<aside className="border-base-200 bg-base-50 flex w-40 shrink-0 flex-col border-r">
			<nav className="flex-1 p-3">
				<ul className="space-y-0.5">
					<SidebarItem to="/window/settings/app" icon={<AppWindowIcon size={16} />} label="App" />
					<SidebarItem to="/window/settings/timer" icon={<TimerIcon size={16} />} label="Timer" />
					<SidebarItem to="/window/settings/goals" icon={<TargetIcon size={16} />} label="Goals" />
					<SidebarItem to="/window/settings/tags" icon={<TagIcon size={16} />} label="Tags" />
					<SidebarItem
						to="/window/settings/activity"
						icon={<ActivityIcon size={16} />}
						label="Activity"
					/>
					{settings.debug.enabled && (
						<SidebarItem
							to="/window/settings/developer"
							icon={<CodeIcon size={16} />}
							label="Developer"
						/>
					)}
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
				<p className="text-base-400 text-center text-xs">{appInfo.version}</p>
			</div>
		</aside>
	);
};
