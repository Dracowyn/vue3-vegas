export interface AnimationConfig {
	duration: number;
}

export interface VegasTransitionHandlers {
	onEnter: (el: Element, done: () => void) => void;
	onLeave: (el: Element, done: () => void) => void;
}

type TransitionFactory = (config: AnimationConfig) => VegasTransitionHandlers;

export type VegasVariants = Record<string, TransitionFactory>;

export const useAnimationVariants = (getTransitionDuration: () => number) => {
	const applyStyles = (el: Element, styles: Record<string, string>) => {
		const htmlEl = el as HTMLElement;
		Object.assign(htmlEl.style, styles);
	};

	const variants: VegasVariants = {
		fade: (config: AnimationConfig) => ({
			onEnter: (el, done) => {
				applyStyles(el, { opacity: '0' });
				requestAnimationFrame(() => {
					applyStyles(el, {
						opacity: '1',
						transition: `opacity ${config.duration}s`,
					});
				});
				setTimeout(done, config.duration * 1000);
			},
			onLeave: (el, done) => {
				applyStyles(el, {
					opacity: '0',
					transition: `opacity ${getTransitionDuration() / 1000}s`,
				});
				setTimeout(done, getTransitionDuration());
			},
		}),
		slideLeft: (config: AnimationConfig) => ({
			onEnter: (el, done) => {
				applyStyles(el, { transform: 'translateX(100%)', opacity: '0' });
				requestAnimationFrame(() => {
					applyStyles(el, {
						transform: 'translateX(0)',
						opacity: '1',
						transition: `transform ${config.duration}s, opacity ${config.duration}s`,
					});
				});
				setTimeout(done, config.duration * 1000);
			},
			onLeave: (el, done) => {
				const dur = getTransitionDuration() / 1000;
				applyStyles(el, {
					transform: 'translateX(-100%)',
					opacity: '0',
					transition: `transform ${dur}s, opacity ${dur}s`,
				});
				setTimeout(done, getTransitionDuration());
			},
		}),
		slideRight: (config: AnimationConfig) => ({
			onEnter: (el, done) => {
				applyStyles(el, { transform: 'translateX(-100%)', opacity: '0' });
				requestAnimationFrame(() => {
					applyStyles(el, {
						transform: 'translateX(0)',
						opacity: '1',
						transition: `transform ${config.duration}s, opacity ${config.duration}s`,
					});
				});
				setTimeout(done, config.duration * 1000);
			},
			onLeave: (el, done) => {
				const dur = getTransitionDuration() / 1000;
				applyStyles(el, {
					transform: 'translateX(100%)',
					opacity: '0',
					transition: `transform ${dur}s, opacity ${dur}s`,
				});
				setTimeout(done, getTransitionDuration());
			},
		}),
		zoomIn: (config: AnimationConfig) => ({
			onEnter: (el, done) => {
				applyStyles(el, { transform: 'scale(0.5)', opacity: '0' });
				requestAnimationFrame(() => {
					applyStyles(el, {
						transform: 'scale(1)',
						opacity: '1',
						transition: `transform ${config.duration}s, opacity ${config.duration}s`,
					});
				});
				setTimeout(done, config.duration * 1000);
			},
			onLeave: (el, done) => {
				const dur = getTransitionDuration() / 1000;
				applyStyles(el, {
					transform: 'scale(0.5)',
					opacity: '0',
					transition: `transform ${dur}s, opacity ${dur}s`,
				});
				setTimeout(done, getTransitionDuration());
			},
		}),
		zoomOut: (config: AnimationConfig) => ({
			onEnter: (el, done) => {
				applyStyles(el, { transform: 'scale(1.25)', opacity: '0' });
				requestAnimationFrame(() => {
					applyStyles(el, {
						transform: 'scale(1)',
						opacity: '1',
						transition: `transform ${config.duration}s, opacity ${config.duration}s`,
					});
				});
				setTimeout(done, config.duration * 1000);
			},
			onLeave: (el, done) => {
				const dur = getTransitionDuration() / 1000;
				applyStyles(el, {
					transform: 'scale(1.25)',
					opacity: '0',
					transition: `transform ${dur}s, opacity ${dur}s`,
				});
				setTimeout(done, getTransitionDuration());
			},
		}),
		zoomInOut: (config: AnimationConfig) => ({
			onEnter: (el, done) => {
				applyStyles(el, { transform: 'scale(1)', opacity: '0' });
				requestAnimationFrame(() => {
					applyStyles(el, {
						transform: 'scale(1.25)',
						opacity: '1',
						transition: `transform ${config.duration}s, opacity ${config.duration}s`,
					});
				});
				setTimeout(done, config.duration * 1000);
			},
			onLeave: (el, done) => {
				const dur = getTransitionDuration() / 1000;
				applyStyles(el, {
					transform: 'scale(1)',
					opacity: '0',
					transition: `transform ${dur}s, opacity ${dur}s`,
				});
				setTimeout(done, getTransitionDuration());
			},
		}),
	};

	return { variants };
};
