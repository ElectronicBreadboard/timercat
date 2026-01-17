import React from 'react';
import { AlertIcon, Badge, CheckIcon, HelpIcon } from '@/components';

export const PermissionBadge: React.FC<TPermissionBadgeProps> = (props) => {
	const { status } = props;

	if (status === true) {
		return (
			<Badge variant="success">
				<CheckIcon className="size-3" />
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
