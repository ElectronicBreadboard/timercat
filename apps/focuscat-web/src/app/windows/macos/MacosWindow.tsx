import React from 'react';
import { AppleIcon } from '@/components/display/icons';
import { appConfig } from '@/environment';
import { DragWidgetHandle, RemoveWidgetHandle } from '@/features/window';

export const MacosWindow: React.FC<TMacosWindowProps> = (props) => {
	const { onClose } = props;

	return (
		<div className="group flex h-full w-full overflow-hidden rounded-xl shadow-lg">
			<a
				href={appConfig.distribution.website}
				target="_blank"
				rel="noopener noreferrer"
				className="bg-base-0 flex min-w-0 flex-1 items-center justify-center rounded-xl p-3 transition hover:opacity-90"
			>
				<AppleIcon className="text-base-900 h-6 w-auto" aria-hidden />
			</a>
			<RemoveWidgetHandle
				className="absolute -top-4 right-2 h-4 w-8 rounded-t-lg"
				onRemove={onClose}
			/>
			<DragWidgetHandle className="absolute top-2 -right-4 h-8 w-4 rounded-r-lg" />
		</div>
	);
};

export interface TMacosWindowProps {
	onClose?: () => void;
}
