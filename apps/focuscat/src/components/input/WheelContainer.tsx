import React from 'react';
import { cn } from '@/lib';

/**
 * Container that adds decoration (fadeouts + center indicator) around a wheel component.
 * Keeps wheel components pure while allowing consistent styling.
 */
export const WheelContainer: React.FC<TWheelContainerProps> = (props) => {
	const { direction = 'horizontal', className, children } = props;

	return (
		<div className={cn('relative', className)}>
			{children}

			{/* Edge fades */}
			{direction === 'horizontal' ? (
				<>
					<div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-linear-to-r from-white to-transparent" />
					<div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-linear-to-l from-white to-transparent" />
				</>
			) : (
				<>
					<div className="pointer-events-none absolute inset-x-0 top-px z-10 h-6 bg-linear-to-b from-white to-transparent" />
					<div className="pointer-events-none absolute inset-x-0 bottom-px z-10 h-6 bg-linear-to-t from-white to-transparent" />
				</>
			)}

			{/* Center indicator */}
			{direction === 'horizontal' ? (
				<div className="pointer-events-none absolute inset-x-0 top-px z-30 flex justify-center">
					<svg
						width="12"
						height="8"
						viewBox="0 0 12 8"
						fill="currentColor"
						className="text-gray-300"
					>
						<path d="M6 8 L12 0 L0 0 Z" />
					</svg>
				</div>
			) : (
				<div className="pointer-events-none absolute inset-y-0 left-0 z-30 flex items-center">
					<svg
						width="6"
						height="10"
						viewBox="0 0 6 10"
						fill="currentColor"
						className="text-gray-300"
					>
						<path d="M6 5 L0 0 L0 10 Z" />
					</svg>
				</div>
			)}
		</div>
	);
};

interface TWheelContainerProps {
	/** Direction of the wheel - affects fadeout and indicator orientation */
	direction?: 'horizontal' | 'vertical';
	className?: string;
	children: React.ReactNode;
}
