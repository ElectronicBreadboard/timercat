import React from 'react';
import { cn } from '@/lib';
import { catConfig } from './cat.config';
import { TCatFace, TCatFur, TCatHand, TCatHat } from './types';

export const Cat = React.forwardRef<TCatRef, TCatProps>((props, ref) => {
	const { fur = 'white', face = 'cute', hat, size = 150, className, onTap } = props;
	const [leftHand, setLeftHand] = React.useState<TCatHand>('up');
	const [rightHand, setRightHand] = React.useState<TCatHand>('up');
	const [lastHand, setLastHand] = React.useState<'left' | 'right'>('right');

	const { basePath, leftHandPath, rightHandPath, facePath, hatPath } = React.useMemo(() => {
		return {
			basePath: catConfig.parts.fur.path.base(fur),
			leftHandPath: catConfig.parts.fur.path.leftHand(fur, leftHand),
			rightHandPath: catConfig.parts.fur.path.rightHand(fur, rightHand),
			facePath: catConfig.parts.face.path(face),
			hatPath: hat != null ? catConfig.parts.hat.path(hat) : null
		};
	}, [fur, leftHand, rightHand, face, hat]);

	const { bottomOffset, visibleHeight } = React.useMemo(() => {
		const offset = catConfig.baseBodyBottomOffset * (size / catConfig.baseSize);
		return {
			bottomOffset: offset,
			visibleHeight: size - offset
		};
	}, [size]);

	// MARK: - Actions

	const tap = React.useCallback(() => {
		if (lastHand === 'right') {
			setLeftHand('down');
			setTimeout(() => setLeftHand('up'), 100);
			setLastHand('left');
		} else {
			setRightHand('down');
			setTimeout(() => setRightHand('up'), 100);
			setLastHand('right');
		}
	}, [lastHand]);

	const handleTap = React.useCallback(() => {
		tap();
		onTap?.();
	}, [tap, onTap]);

	// MARK: - Effects

	React.useImperativeHandle(ref, () => ({ tap }), [tap]);

	// MARK: - UI

	return (
		<div
			className={cn('pointer-events-none relative', className)}
			style={{ width: size, height: visibleHeight }}
		>
			{/* Tap target */}
			<div
				className="pointer-events-auto absolute inset-0 cursor-pointer"
				onPointerDown={handleTap}
			/>
			{/* Cat layers */}
			<div
				className="pointer-events-none absolute bottom-0 left-0"
				style={{
					width: size,
					height: size,
					transform: `translateY(${bottomOffset}px)`
				}}
			>
				<img
					src={basePath}
					alt=""
					draggable={false}
					className="absolute inset-0 h-full w-full select-none"
				/>
				<img
					src={leftHandPath}
					alt=""
					draggable={false}
					className="absolute inset-0 h-full w-full select-none"
				/>
				<img
					src={facePath}
					alt=""
					draggable={false}
					className="absolute inset-0 h-full w-full select-none"
				/>
				{hatPath != null && (
					<img
						src={hatPath}
						alt=""
						draggable={false}
						className="absolute inset-0 h-full w-full select-none"
					/>
				)}
				<img
					src={rightHandPath}
					alt=""
					draggable={false}
					className="absolute inset-0 h-full w-full select-none"
				/>
			</div>
		</div>
	);
});
Cat.displayName = 'Cat';

interface TCatProps {
	fur?: TCatFur;
	face?: TCatFace;
	hat?: TCatHat;
	size?: number;
	className?: string;
	onTap?: () => void;
}

export interface TCatRef {
	tap: () => void;
}
