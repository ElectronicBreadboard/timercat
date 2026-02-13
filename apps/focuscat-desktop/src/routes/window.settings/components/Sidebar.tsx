import { useLocation } from '@tanstack/react-router';
import { useFeatureState } from 'feature-react/state';
import React from 'react';
import {
	ActivityIcon,
	AppWindowIcon,
	Button,
	CodeIcon,
	InfoIcon,
	TagIcon,
	TargetIcon,
	TimerIcon
} from '@/components';
import { specta } from '@/environment';
import { useSettingsCx } from '@/features/settings';
import { useAppInfo } from '@/hooks';
import { SidebarItem } from './SidebarItem';

export const Sidebar: React.FC<TSidebarProps> = (props) => {
	const { readOnlyPrefixes = [] } = props;
	const location = useLocation();
	const settingsCx = useSettingsCx();
	const settings = useFeatureState(settingsCx.$appSettings);
	const appInfo = useAppInfo();

	const isReadonly = React.useMemo(
		() => readOnlyPrefixes.some((prefix) => location.pathname.startsWith(prefix)),
		[readOnlyPrefixes, location.pathname]
	);

	return (
		<aside className="border-base-200 bg-base-50 flex w-40 shrink-0 flex-col border-r">
			<nav className="flex-1 p-3">
				<ul className="space-y-0.5">
					<SidebarItem
						to="/window/settings/app"
						icon={<AppWindowIcon size={16} />}
						label="App"
						disabled={isReadonly}
					/>
					<SidebarItem
						to="/window/settings/timer"
						icon={<TimerIcon size={16} />}
						label="Timer"
						disabled={isReadonly}
					/>
					{settings.features.goals && (
						<SidebarItem
							to="/window/settings/goals"
							icon={<TargetIcon size={16} />}
							label="Goals"
							disabled={isReadonly}
						/>
					)}
					{settings.features.profiles && (
						<SidebarItem
							to="/window/settings/focus-profiles"
							icon={<TagIcon size={16} />}
							label="Profiles"
							disabled={isReadonly}
						/>
					)}
					{settings.features.activity && (
						<SidebarItem
							to="/window/settings/activity"
							icon={<ActivityIcon size={16} />}
							label="Activity"
							disabled={isReadonly}
						/>
					)}
					{settings.features.debug && (
						<SidebarItem
							to="/window/settings/developer"
							icon={<CodeIcon size={16} />}
							label="Developer"
							disabled={isReadonly}
						/>
					)}
					<SidebarItem
						to="/window/settings/about"
						icon={<InfoIcon size={16} />}
						label="About"
						disabled={isReadonly}
					/>
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

interface TSidebarProps {
	readOnlyPrefixes?: readonly string[];
}
