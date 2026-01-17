import React from 'react';
import { AlertIcon, CheckIcon, ChevronRightIcon, HelpIcon } from '@/components';
import { specta } from '@/environment';
import { cn } from '@/lib';

export const PermissionStatusView: React.FC<TPermissionStatusViewProps> = (props) => {
	const { className } = props;
	const [granted, setGranted] = React.useState<boolean | null>(null);

	const checkPermission = React.useCallback(async () => {
		const isGranted = await specta.commands.isAccessibilityGranted();
		setGranted(isGranted);
	}, []);

	React.useEffect(() => {
		checkPermission();

		// Re-check when window gains focus (user may have changed permissions)
		const handleFocus = () => checkPermission();
		window.addEventListener('focus', handleFocus);
		return () => window.removeEventListener('focus', handleFocus);
	}, [checkPermission]);

	return (
		<button
			type="button"
			onClick={() => specta.commands.openAccessibilitySettings()}
			className={cn(
				'flex items-center gap-2 rounded-lg px-2 py-1 transition-colors hover:bg-gray-100',
				className
			)}
		>
			<StatusIndicator status={granted} />
			<ChevronRightIcon className="size-4 text-gray-400" />
		</button>
	);
};

interface TPermissionStatusViewProps {
	className?: string;
}

const StatusIndicator: React.FC<TStatusIndicatorProps> = (props) => {
	const { status } = props;

	if (status === true) {
		return (
			<span className="flex items-center gap-1.5 text-xs font-medium text-green-600">
				<CheckIcon className="size-4" />
				Granted
			</span>
		);
	}
	if (status === false) {
		return (
			<span className="flex items-center gap-1.5 text-xs font-medium text-amber-600">
				<AlertIcon className="size-4" />
				Required
			</span>
		);
	}
	return (
		<span className="flex items-center gap-1.5 text-xs font-medium text-gray-400">
			<HelpIcon className="size-4" />
			Checking
		</span>
	);
};

interface TStatusIndicatorProps {
	status: boolean | null;
}
