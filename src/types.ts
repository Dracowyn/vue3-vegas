export interface VegasProps {
	slide?: number;
	delay?: number;
	loop?: boolean;
	preload?: boolean;
	preloadImage?: boolean;
	preloadImageBatch?: number;
	/** @deprecated 使用 `preloadImageBatch` 代替 */
	preLoadImageBatch?: number;
	preloadVideo?: boolean;
	showLoading?: boolean;
	timer?: boolean;
	overlay?: boolean;
	autoplay?: boolean;
	shuffle?: boolean;
	cover?: boolean;
	color?: string | null;
	align?: 'left' | 'center' | 'right';
	valign?: 'top' | 'center' | 'bottom';
	firstTransition?: string | null;
	firstTransitionDuration?: number;
	transition?: string;
	transitionDuration?: number;
	defaultBackground?: string;
	defaultBackgroundDuration?: number;
	loadingText?: string;
	overlayColor?: string;
	debug?: boolean;
	slides: SlideProps[];
	onInit?: () => void;
	onPlay?: () => void;
	onPause?: () => void;
	onWalk?: () => void;
}

export interface SlideProps {
	src: string;
	color?: string | null;
	delay?: number | null;
	align?: 'left' | 'center' | 'right';
	valign?: 'top' | 'center' | 'bottom';
	transition?: string | null;
	transitionDuration?: number | null;
	cover?: boolean;
	video?: {
		src: string[];
		muted?: boolean;
		loop?: boolean;
	};
}

export interface VegasHandle {
	previous: () => void;
	next: () => void;
	play: () => void;
	pause: () => void;
}

export type Logger = (message: string, ...args: unknown[]) => void;

export type VegasPhase =
	| 'idle'
	| 'preloading'
	| 'showingDefaultBackground'
	| 'firstSlide'
	| 'playing'
	| 'paused';
