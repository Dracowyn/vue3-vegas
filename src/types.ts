import type { VegasTransitionName } from './effects/transitionPresets';
import type { VegasAnimationName } from './effects/kenBurnsPresets';

/**
 * 效果名（过渡 / Ken Burns 动画）的输入类型：内置名字面量联合 + `'random'` + 任意自定义
 * 字符串（经 `transitionRegister` / `animationRegister` 登记的名字，或使用者自己维护的名单）。
 * `(string & {})` 是保留字面量联合自动补全、同时仍接受任意 string 的惯用写法——
 * 直接用 `string` 会让整个联合类型折叠成 `string`，字面量补全就失效了。
 */
export type VegasEffectName<Name extends string> = Name | 'random' | (string & {});

export interface VegasProps {
	slide?: number;
	delay?: number;
	/**
	 * `delay: 'video'` 的视频幻灯片最长停留多久（ms），默认 300000（5 分钟）。
	 * 视频卡在缓冲、迟迟播不完时靠它兜底切走，正常播完会提前切换。
	 */
	videoMaxDelay?: number;
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
	/** 第一张幻灯片的进入效果，不设置则使用 `transition`。数组 = 每次切换时从中随机抽一个（与 `transition` 同理） */
	firstTransition?: VegasEffectName<VegasTransitionName> | readonly VegasEffectName<VegasTransitionName>[] | null;
	/** 第一张幻灯片进入动画时长（ms）。缺省（`null`）时回退到 `transitionDuration`（与原版 Vegas.js 语义一致） */
	firstTransitionDuration?: number | null;
	/** 幻灯片切换过渡效果，支持 `'random'`。传数组时每次切换从数组里随机抽一个（原版语义） */
	transition?: VegasEffectName<VegasTransitionName> | readonly VegasEffectName<VegasTransitionName>[];
	transitionDuration?: number;
	/** Ken Burns 动画名，支持 `'random'`。传数组时每次切换从数组里随机抽一个（原版语义） */
	animation?: VegasEffectName<VegasAnimationName> | readonly VegasEffectName<VegasAnimationName>[] | null;
	animationDuration?: number | 'auto';
	/**
	 * 注册自定义过渡名，并入内置池供 `transition: 'random'` 抽取（不是限定候选池）。
	 * 自定义名靠 CSS 类生效：入场元素依次获得 `vegas-transition-{name}` 与
	 * `vegas-transition-{name}-in`，离场元素获得 `vegas-transition-{name}-out`，
	 * 具体样式由使用者的 CSS 定义。
	 */
	transitionRegister?: readonly string[];
	/**
	 * 注册自定义动画名，并入内置池供 `animation: 'random'` 抽取（不是限定候选池）。
	 * 自定义名靠 CSS 类生效：内层媒体元素获得 `vegas-animation-{name}` 类并设置
	 * `animationDuration`，`@keyframes` 由使用者的 CSS 定义。
	 */
	animationRegister?: readonly string[];
	defaultBackground?: string;
	defaultBackgroundDuration?: number;
	loadingText?: string;
	overlayColor?: string;
	debug?: boolean;
	slides: SlideProps[];
	onInit?: () => void;
	/** 开始/恢复播放时触发，收到当前幻灯片的下标与配置 */
	onPlay?: (index: number, slide: SlideProps) => void;
	/** 暂停时触发，收到当前幻灯片的下标与配置 */
	onPause?: (index: number, slide: SlideProps) => void;
	/** 每次切换幻灯片时触发，收到目标幻灯片的下标与配置 */
	onWalk?: (index: number, slide: SlideProps) => void;
	/**
	 * `loop: false` 时播完最后一张触发，收到仍在显示的那一张的下标与配置。
	 * 只由「往后走到头」触发；`previous()` 退到第一张不算播完（与原版一致）。
	 */
	onEnd?: (index: number, slide: SlideProps) => void;
}

export interface SlideProps {
	src: string;
	color?: string | null;
	/**
	 * 停留时长（ms），覆盖全局 delay。
	 * 视频幻灯片可设为 `'video'`：完整播一遍再切（忽略 `video.loop`），最长不超过 `videoMaxDelay`；
	 * 所有视频源都加载失败或播放途中出致命错误时直接切走。图片幻灯片上设 `'video'` 等同未设置。
	 */
	delay?: number | 'video' | null;
	align?: 'left' | 'center' | 'right';
	valign?: 'top' | 'center' | 'bottom';
	/** 过渡效果，覆盖全局 transition。支持数组（同 `VegasProps.transition`） */
	transition?: VegasEffectName<VegasTransitionName> | readonly VegasEffectName<VegasTransitionName>[] | null;
	transitionDuration?: number | null;
	/** Ken Burns 动画名，覆盖全局 animation。支持数组（同 `VegasProps.animation`） */
	animation?: VegasEffectName<VegasAnimationName> | readonly VegasEffectName<VegasAnimationName>[] | null;
	animationDuration?: number | 'auto' | null;
	cover?: boolean;
	video?: SlideVideo;
}

export interface SlideVideoConfig {
	src: string[];
	/**
	 * 是否静音，默认 `true`（与原版 Vegas.js 一致；不静音会被浏览器自动播放策略拦截）。
	 * 设为 `false` 时，视频进入会随过渡淡入音量、离场会淡出并暂停，避免新旧两段声音硬切重叠。
	 */
	muted?: boolean;
	/** 是否循环播放，默认 `true`；设为 `false` 时视频结束会自动切换到下一张 */
	loop?: boolean;
}

/**
 * 视频配置。数组简写 `['a.mp4', 'b.webm']` 等价于 `{ src: ['a.mp4', 'b.webm'] }`
 * （`muted` / `loop` 取默认值 `true`），与原版 Vegas.js 一致。
 */
export type SlideVideo = string[] | SlideVideoConfig;

export interface VegasHandle {
	/**
	 * 切换到上一张，返回请求是否被接受（不代表切换已经真正发生）。
	 * 目标是图片幻灯片且图片尚未加载完成时，切换会推迟到该图片 `load` / `error` 之后才真正提交。
	 */
	previous: () => boolean;
	/**
	 * 切换到下一张，返回请求是否被接受（不代表切换已经真正发生）。
	 * 目标是图片幻灯片且图片尚未加载完成时，切换会推迟到该图片 `load` / `error` 之后才真正提交。
	 */
	next: () => boolean;
	/**
	 * 跳转到指定下标（原版 Vegas 的 `jump`）。下标越界、目标就是当前幻灯片、
	 * 或上一次切换动画尚未结束时不做任何事并返回 `false`；否则返回 `true`，表示请求
	 * 被接受——目标是图片幻灯片且图片尚未加载完成时，切换会推迟到该图片
	 * `load` / `error` 之后才真正提交（视频幻灯片不等）。待提交期间再次调用
	 * `previous` / `next` / `goTo` 会取代这次请求。
	 */
	goTo: (index: number) => boolean;
	/** 当前幻灯片在 `slides` 中的下标（shuffle 下也是真实下标，不是播放顺序位置） */
	current: () => number;
	play: () => void;
	pause: () => void;
	/** 在播放与暂停之间切换 */
	toggle: () => void;
	/** 是否正在自动播放，与 `onPlay` / `onPause` 的时机一致 */
	playing: () => boolean;
}

export type Logger = (message: string, ...args: unknown[]) => void;

export type VegasPhase =
	| 'idle'
	| 'preloading'
	| 'showingDefaultBackground'
	| 'firstSlide'
	| 'playing'
	| 'paused';
