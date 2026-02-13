import { cva } from 'class-variance-authority';
import React from 'react';
import { Badge } from '@/components';
import { specta } from '@/environment';

export const TargetTag: React.FC<TTargetTagProps> = (props) => {
	const { target } = props;

	const label = React.useMemo(() => {
		switch (target.type) {
			case 'all':
				return 'all apps & websites';
			case 'app':
				return target.name ?? target.bundle_id;
			case 'website':
				return target.name ?? target.domain;
		}
	}, [target]);

	return (
		<Badge className={badgeVariants({ type: target.type })}>
			{target.type !== 'all' &&
				(target.icon != null ? (
					<img src={target.icon} alt="" className="size-4 shrink-0 rounded-sm object-contain" />
				) : (
					<span className={iconVariants({ type: target.type })}>
						{target.type === 'app' ? 'A' : 'W'}
					</span>
				))}
			{label}
		</Badge>
	);
};

interface TTargetTagProps {
	target: specta.RuleTargetDto;
}

const badgeVariants = cva('gap-1.5 px-1.5 text-sm', {
	variants: {
		type: {
			app: 'bg-blue-500/20 text-blue-700 dark:text-blue-300',
			website: 'bg-violet-500/20 text-violet-700 dark:text-violet-300',
			all: 'bg-base-200 text-base-700 dark:text-base-300'
		}
	}
});

const iconVariants = cva(
	'flex size-4 shrink-0 items-center justify-center rounded-sm text-[10px] font-medium',
	{
		variants: {
			type: {
				app: 'bg-blue-200 text-blue-600 dark:bg-blue-500/30 dark:text-blue-400',
				website: 'bg-violet-200 text-violet-600 dark:bg-violet-500/30 dark:text-violet-400'
			}
		}
	}
);

export function targetKey(target: specta.RuleTargetDto): string {
	switch (target.type) {
		case 'all':
			return 'all';
		case 'app':
			return `app:${target.bundle_id}`;
		case 'website':
			return `website:${target.domain}`;
	}
}
