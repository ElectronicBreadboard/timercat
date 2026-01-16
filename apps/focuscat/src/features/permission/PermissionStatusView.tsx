import React from 'react';
import { AlertIcon, CheckIcon, ChevronRightIcon, HelpIcon } from '@/components/display/icons';
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
				'flex items-center gap-2 rounded-lg bg-gray-50 p-2 text-left transition-colors hover:bg-gray-100',
				className
			)}
		>
			<StatusIcon status={granted} />
			<div className="flex-1">
				<p className="text-xs font-medium text-gray-600">Accessibility</p>
				<p className="text-xs text-gray-400">Required for window tracking</p>
			</div>
			<ChevronRightIcon className="size-4 text-gray-400" />
		</button>
	);
};

// MARK: - Components

const StatusIcon: React.FC<{ status: boolean | null }> = ({ status }) => {
	if (status === true) {
		return <CheckIcon className="size-5 text-green-500" />;
	}
	if (status === false) {
		return <AlertIcon className="size-5 text-yellow-500" />;
	}
	return <HelpIcon className="size-5 text-gray-400" />;
};

// MARK: - Types

interface TPermissionStatusViewProps {
	className?: string;
}
