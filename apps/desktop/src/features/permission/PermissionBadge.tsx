import { AlertIcon, Badge, CheckCircleIcon, HelpIcon } from '@repo/ui';
import React from 'react';

export const PermissionBadge: React.FC<TPermissionBadgeProps> = (props) => {
	const { status } = props;

	if (status === true) {
		return (
			<Badge variant="success">
				<CheckCircleIcon className="size-3" />
				Granted
			</Badge>
		);
	}
	if (status === false) {
		return (
			<Badge variant="warning">
				<AlertIcon className="size-3" />
				Required
			</Badge>
		);
	}
	return (
		<Badge variant="neutral">
			<HelpIcon className="size-3" />
			Checking
		</Badge>
	);
};

interface TPermissionBadgeProps {
	status: boolean | null;
}
