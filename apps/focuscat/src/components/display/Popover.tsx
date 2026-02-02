import { Popover as BasePopover } from '@base-ui/react/popover';
import React from 'react';
import { cn } from '@/lib';

const Content: React.FC<TContentProps> = (props) => {
	const { side = 'bottom', sideOffset = 8, className, children } = props;

	return (
		<BasePopover.Portal>
			<BasePopover.Positioner side={side} sideOffset={sideOffset}>
				<BasePopover.Popup
					className={cn(
						'bg-base-0 shadow-base-200 outline-base-200 rounded-lg shadow-lg outline-1',
						className
					)}
				>
					<BasePopover.Arrow className="flex data-[side=bottom]:-top-2 data-[side=bottom]:rotate-0 data-[side=left]:-right-3 data-[side=left]:rotate-90 data-[side=right]:-left-3 data-[side=right]:-rotate-90 data-[side=top]:-bottom-2 data-[side=top]:rotate-180">
						<ArrowSvg />
					</BasePopover.Arrow>
					{children}
				</BasePopover.Popup>
			</BasePopover.Positioner>
		</BasePopover.Portal>
	);
};

interface TContentProps {
	side?: 'top' | 'bottom' | 'left' | 'right';
	sideOffset?: number;
	className?: string;
	children: React.ReactNode;
}

export const Popover = {
	Root: BasePopover.Root,
	Trigger: BasePopover.Trigger,
	Content
};

const ArrowSvg: React.FC<React.ComponentProps<'svg'>> = (props) => (
	<svg width="20" height="10" viewBox="0 0 20 10" fill="none" {...props}>
		<path
			d="M9.66437 2.60207L4.80758 6.97318C4.07308 7.63423 3.11989 8 2.13172 8H0V10H20V8H18.5349C17.5468 8 16.5936 7.63423 15.8591 6.97318L11.0023 2.60207C10.622 2.2598 10.0447 2.25979 9.66437 2.60207Z"
			className="fill-base-0"
		/>
		<path
			d="M8.99542 1.85876C9.75604 1.17425 10.9106 1.17422 11.6713 1.85878L16.5281 6.22989C17.0789 6.72568 17.7938 7.00001 18.5349 7.00001L15.89 7L11.0023 2.60207C10.622 2.2598 10.0447 2.2598 9.66436 2.60207L4.77734 7L2.13171 7.00001C2.87284 7.00001 3.58774 6.72568 4.13861 6.22989L8.99542 1.85876Z"
			className="fill-base-200"
		/>
	</svg>
);
