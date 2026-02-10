import React from 'react';
import { cn } from '@/lib';
import { catConfig } from './cat.config';
import { TCatFace, TCatFur, TCatHand, TCatHat } from './types';

export const Cat = React.forwardRef<TCatRef, TCatProps>((props, ref) => {
	const {
		fur = 'white',
		face = 'cute',
		hat,
		size = 150,
		position = 'edge',
		className,
		onTap
	} = props;
	const [leftHand, setLeftHand] = React.useState<TCatHand>('up');
	const [rightHand, setRightHand] = React.useState<TCatHand>('up');
	const [lastHand, setLastHand] = React.useState<'left' | 'right'>('right');
	const cooldownUntil = React.useRef(0);

	const { basePath, leftHandPath, rightHandPath, facePath, hatPath } = React.useMemo(() => {
		return {
			basePath: catConfig.parts.fur.path.base(fur),
			leftHandPath: catConfig.parts.fur.path.leftHand(fur, leftHand),
			rightHandPath: catConfig.parts.fur.path.rightHand(fur, rightHand),
			facePath: catConfig.parts.face.path(face),
			hatPath: hat != null ? catConfig.parts.hat.path(hat) : null
		};
	}, [fur, leftHand, rightHand, face, hat]);

	const { bottomOffset, containerHeight } = React.useMemo(() => {
		const offset = catConfig.baseBodyBottomOffset * (size / catConfig.baseSize);
		return {
			bottomOffset: position === 'edge' ? offset : 0,
			containerHeight: position === 'edge' ? size - offset : size
		};
	}, [size, position]);

	// MARK: - Actions

	const tap = React.useCallback(
		(options: TTapOptions = {}) => {
			const { mode = lastHand === 'right' ? 'left' : 'right', cooldown = catConfig.tapThrottleMs } =
				options;

			if (cooldown !== 0 && Date.now() < cooldownUntil.current) {
				return;
			}

			if (mode === 'left' || mode === 'both') {
				setLeftHand('down');
				setTimeout(() => setLeftHand('up'), 100);
			}
			if (mode === 'right' || mode === 'both') {
				setRightHand('down');
				setTimeout(() => setRightHand('up'), 100);
			}
			if (mode !== 'both') {
				setLastHand(mode);
			}

			cooldownUntil.current = Date.now() + cooldown;
		},
		[lastHand]
	);

	const handleTap = React.useCallback(() => {
		const tapOptions = onTap?.() as TTapOptions | undefined;
		tap({ ...tapOptions, cooldown: 0 });
	}, [tap, onTap]);

	// MARK: - Effects

	React.useImperativeHandle(ref, () => ({ tap }), [tap]);

	// MARK: - UI

	return (
		<div
			className={cn('pointer-events-none relative', className)}
			style={{ width: size, height: containerHeight }}
		>
			{/* Tap target */}
			<div className="pointer-events-auto absolute inset-0" onPointerDown={handleTap} />
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
	hat?: TCatHat | null;
	size?: number;
	position?: 'edge' | 'centered';
	className?: string;
	onTap?: (() => TTapOptions) | (() => void);
}

export interface TCatRef {
	tap: (options?: TTapOptions) => void;
}

export type TCatTapMode = 'left' | 'right' | 'both';

export interface TTapOptions {
	mode?: TCatTapMode;
	cooldown?: number;
}
