import { ArrowUpRightIcon, ChevronRightIcon, cn, InfoIcon } from '@repo/ui';
import { openUrl } from '@tauri-apps/plugin-opener';
import { cva } from 'class-variance-authority';
import React from 'react';

const interactiveStyles = [
	'transition-colors duration-100 hover:bg-base-100',
	'outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset'
];

const settingItemVariants = cva('flex w-full items-center justify-between px-4 py-3 text-left', {
	variants: {
		variant: {
			static: '',
			link: interactiveStyles,
			nav: interactiveStyles,
			action: interactiveStyles
		}
	},
	defaultVariants: {
		variant: 'static'
	}
});

export const SettingItem: React.FC<TSettingItemProps> = (props) => {
	const {
		variant = 'static',
		label,
		description,
		descriptionClassName,
		disabled = false,
		children,
		className
	} = props;

	const content = (
		<>
			<div className="flex-1 pr-4">
				<span className="text-base-900 text-sm font-medium">{label}</span>
				{description != null && (
					<p className={cn('text-base-500 text-xs', descriptionClassName)}>{description}</p>
				)}
			</div>
			<div className="flex shrink-0 items-center gap-2">
				{children}
				{variant === 'link' && <ArrowUpRightIcon className="text-base-400 size-4" />}
				{variant === 'nav' && <ChevronRightIcon className="text-base-400 size-4" />}
			</div>
		</>
	);

	const rootClassName = cn(settingItemVariants({ variant }), disabled && 'bg-base-100', className);

	if (props.variant === 'link') {
		return (
			<button type="button" onClick={() => openUrl(props.href)} className={rootClassName}>
				{content}
			</button>
		);
	}

	if (props.variant === 'nav' || props.variant === 'action') {
		return (
			<button type="button" onClick={props.onClick} className={rootClassName}>
				{content}
			</button>
		);
	}

	return <div className={rootClassName}>{content}</div>;
};

export type TSettingItemProps =
	| (TSettingItemBase & { variant?: 'static'; href?: never; onClick?: never })
	| (TSettingItemBase & { variant: 'link'; href: string; onClick?: never })
	| (TSettingItemBase & { variant: 'nav'; onClick: () => void; href?: never })
	| (TSettingItemBase & { variant: 'action'; onClick: () => void; href?: never });

interface TSettingItemBase {
	label: string;
	description?: React.ReactNode;
	descriptionClassName?: string;
	disabled?: boolean;
	children?: React.ReactNode;
	className?: string;
}

// MARK: - SettingItemWarnDescription

export const SettingItemWarnDescription: React.FC<TSettingItemWarnDescriptionProps> = (props) => {
	const { text, url, className } = props;

	return (
		<span className={cn('text-yellow-600', className)}>
			{text}
			{url != null && (
				<>
					{' '}
					<a
						href={url}
						target="_blank"
						rel="noopener noreferrer"
						onClick={(e) => {
							e.preventDefault();
							openUrl(url);
						}}
						className="inline-flex items-center align-bottom"
						aria-label="Learn more"
					>
						<InfoIcon className="size-3.5 shrink-0" />
					</a>
				</>
			)}
		</span>
	);
};

export interface TSettingItemWarnDescriptionProps {
	text: string;
	url?: string;
	className?: string;
}
