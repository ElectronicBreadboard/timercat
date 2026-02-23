import React from 'react';

export const Fireflies: React.FC<TFirefliesProps> = (props) => {
	const {
		variants = [
			{ left: '10%', top: '20%', dx: '30px', dy: '-25px', duration: 5, delay: 0 },
			{ left: '25%', top: '60%', dx: '-20px', dy: '-40px', duration: 6, delay: 1 },
			{ left: '40%', top: '15%', dx: '45px', dy: '20px', duration: 5.5, delay: 2 },
			{ left: '55%', top: '75%', dx: '-35px', dy: '-30px', duration: 6.5, delay: 0.5 },
			{ left: '70%', top: '35%', dx: '25px', dy: '-35px', duration: 5, delay: 1.5 },
			{ left: '85%', top: '55%', dx: '-40px', dy: '25px', duration: 6, delay: 2.5 },
			{ left: '15%', top: '80%', dx: '50px', dy: '-20px', duration: 5.5, delay: 3 },
			{ left: '90%', top: '25%', dx: '-30px', dy: '-45px', duration: 6.5, delay: 0.8 },
			{ left: '35%', top: '45%', dx: '-25px', dy: '30px', duration: 5, delay: 2.2 },
			{ left: '60%', top: '8%', dx: '35px', dy: '-15px', duration: 6, delay: 1.2 },
			{ left: '5%', top: '50%', dx: '40px', dy: '-35px', duration: 5.5, delay: 3.5 },
			{ left: '75%', top: '70%', dx: '-45px', dy: '20px', duration: 6.5, delay: 1.8 },
			{ left: '50%', top: '30%', dx: '20px', dy: '-40px', duration: 5, delay: 0.3 },
			{ left: '20%', top: '40%', dx: '-35px', dy: '-25px', duration: 6, delay: 2.8 },
			{ left: '95%', top: '60%', dx: '-20px', dy: '35px', duration: 5.5, delay: 1 },
			{ left: '30%', top: '85%', dx: '45px', dy: '-30px', duration: 6.5, delay: 2 },
			{ left: '65%', top: '50%', dx: '-40px', dy: '-20px', duration: 5, delay: 3.2 },
			{ left: '80%', top: '12%', dx: '30px', dy: '40px', duration: 6, delay: 0.6 }
		]
	} = props;

	return (
		<div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
			{variants.map((v, i) => (
				<div
					key={i}
					className="animate-firefly absolute h-2 w-2 rounded-full bg-amber-200/95 shadow-[0_0_10px_4px_rgba(253,230,138,0.85),0_0_24px_10px_rgba(253,230,138,0.5),0_0_40px_16px_rgba(254,243,199,0.3)]"
					style={
						{
							'left': v.left,
							'top': v.top,
							'--firefly-dx': v.dx,
							'--firefly-dy': v.dy,
							'animationDuration': `${v.duration}s`,
							'animationDelay': `-${v.delay}s`
						} as React.CSSProperties
					}
				/>
			))}
		</div>
	);
};

interface TFirefliesProps {
	variants?: TFireflyVariant[];
}

interface TFireflyVariant {
	left: string;
	top: string;
	dx: string;
	dy: string;
	duration: number;
	delay: number;
}
