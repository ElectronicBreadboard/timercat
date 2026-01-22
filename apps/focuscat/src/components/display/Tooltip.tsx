import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip';
import React from 'react';
import { cn } from '@/lib';

export const TooltipProvider = BaseTooltip.Provider;

export const Tooltip: React.FC<TTooltipProps> = (props) => {
	const {
		children,
		content,
		side = 'top',
		sideOffset = 8,
		delay,
		boundary,
		className,
		positionerClassName
	} = props;

	return (
		<BaseTooltip.Root>
			<BaseTooltip.Trigger render={children} delay={delay} />
			<BaseTooltip.Portal>
				<BaseTooltip.Positioner
					side={side}
					sideOffset={sideOffset}
					collisionBoundary={boundary ?? undefined}
					className={positionerClassName}
				>
					<BaseTooltip.Popup
						className={cn(
							'bg-base-0 text-base-900 max-w-xs rounded-md px-2.5 py-1.5 text-xs shadow-lg',
							'outline-base-200 outline-1',
							'origin-(--transform-origin)',
							'transition-[transform,scale,opacity] duration-150',
							'data-starting-style:scale-90 data-starting-style:opacity-0',
							'data-ending-style:scale-90 data-ending-style:opacity-0',
							className
						)}
					>
						<BaseTooltip.Arrow className="data-[side=bottom]:-top-1.5 data-[side=left]:-right-1.5 data-[side=left]:rotate-90 data-[side=right]:-left-1.5 data-[side=right]:-rotate-90 data-[side=top]:-bottom-1.5 data-[side=top]:rotate-180">
							<ArrowSvg />
						</BaseTooltip.Arrow>
						{content}
					</BaseTooltip.Popup>
				</BaseTooltip.Positioner>
			</BaseTooltip.Portal>
		</BaseTooltip.Root>
	);
};

interface TTooltipProps {
	children: React.ReactElement;
	content: React.ReactNode;
	side?: 'top' | 'bottom' | 'left' | 'right';
	sideOffset?: number;
	delay?: number;
	boundary?: Element | null;
	className?: string;
	positionerClassName?: string;
}

const ArrowSvg: React.FC<React.ComponentProps<'svg'>> = (props) => (
	<svg width="12" height="6" viewBox="0 0 12 6" fill="none" {...props}>
		<path
			d="M5.79862 1.56124L2.88455 4.18391C2.44385 4.58054 1.87193 4.8 1.27903 4.8H0V6H12V4.8H11.121C10.5281 4.8 9.95617 4.58054 9.51546 4.18391L6.60139 1.56124C6.33721 1.3159 5.92278 1.3159 5.65862 1.56124Z"
			className="fill-base-0"
		/>
		<path
			d="M5.79862 1.56124L2.88455 4.18391C2.44385 4.58054 1.87193 4.8 1.27903 4.8H0V5H12V4.8H11.121C10.5281 4.8 9.95617 4.58054 9.51546 4.18391L6.60139 1.56124C6.33721 1.3159 5.92278 1.3159 5.65862 1.56124Z"
			className="fill-base-200"
		/>
	</svg>
);
