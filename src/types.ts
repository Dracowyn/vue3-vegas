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
	animation?: string | null;
	animationDuration?: number | 'auto';
	/** 限定 `transition: 'random'` 的候选池；缺省时从全部内置过渡中选 */
	transitionRegister?: string[];
	/** 限定 `animation: 'random'` 的候选池；缺省时从全部内置动画中选 */
	animationRegister?: string[];
	defaultBackground?: string;
	defaultBackgroundDuration?: number;
	loadingText?: string;
	overlayColor?: string;
	debug?: boolean;
	slides: SlideProps[];
	onInit?: () => void;
	onPlay?: () => void;
	onPause?: () => void;
	/** 每次切换幻灯片时触发，收到目标幻灯片的下标与配置 */
	onWalk?: (index: number, slide: SlideProps) => void;
}

export interface SlideProps {
	src: string;
	color?: string | null;
	delay?: number | null;
	align?: 'left' | 'center' | 'right';
	valign?: 'top' | 'center' | 'bottom';
	transition?: string | null;
	transitionDuration?: number | null;
	animation?: string | null;
	animationDuration?: number | 'auto' | null;
	cover?: boolean;
	video?: {
		src: string[];
		muted?: boolean;
		loop?: boolean;
	};
}

export interface VegasHandle {
	/** 切换到上一张，返回是否真的开始了切换 */
	previous: () => boolean;
	/** 切换到下一张，返回是否真的开始了切换 */
	next: () => boolean;
	/**
	 * 跳转到指定下标（原版 Vegas 的 `jump`）。下标越界、目标就是当前幻灯片、
	 * 或上一次切换动画尚未结束时不做任何事并返回 `false`。
	 */
	goTo: (index: number) => boolean;
	/** 当前幻灯片在 `slides` 中的下标（shuffle 下也是真实下标，不是播放顺序位置） */
	current: () => number;
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
