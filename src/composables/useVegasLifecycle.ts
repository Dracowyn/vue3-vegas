import { ref, watch, onMounted, onUnmounted } from 'vue';
import type { Logger, SlideProps, VegasPhase } from '../types';
import { whenImageReady } from '../utils/imageReady';
import { getSlideImageWaitSrc, MAX_STALE_IMAGE_RETRIES } from '../utils/slideImageWait';

export interface UseVegasLifecycleOptions {
	getPreload: () => boolean;
	getAutoplay: () => boolean;
	getHasDefaultBackground: () => boolean;
	getDefaultBackgroundDuration: () => number;
	getFirstTransitionDuration: () => number;
	/** 首帧要等的那张幻灯片下标——已经过 useVegasState 解析（可能因 shuffle / 越界钳位不同于 props.slide） */
	getCurrentSlideIndex: () => number;
	getSlides: () => SlideProps[];
	preloadResources: () => Promise<void>;
	log: () => Logger;
}

export const useVegasLifecycle = (options: UseVegasLifecycleOptions) => {
	const {
		getPreload,
		getAutoplay,
		getHasDefaultBackground,
		getDefaultBackgroundDuration,
		getFirstTransitionDuration,
		getCurrentSlideIndex,
		getSlides,
		preloadResources,
		log,
	} = options;

	const phase = ref<VegasPhase>('idle');
	let backgroundTimer: number | null = null;
	let firstSlideTimer: number | null = null;
	let lifecycleId = 0;

	// 首帧图片就绪等待：与预加载、默认背景阶段并行发起（见 runLifecycle 开头），
	// 不串行叠加等待时间。cancelFirstSlideWait 在新一轮 runLifecycle 开始、或组件
	// 卸载时摘掉监听，避免过期的等待在稍后触发无意义的 resolve。
	let cancelFirstSlideWait: (() => void) | null = null;

	const clearTimer = (timer: number | null) => {
		if (timer !== null) clearTimeout(timer);
	};

	const clearTimers = () => {
		clearTimer(backgroundTimer);
		backgroundTimer = null;
		clearTimer(firstSlideTimer);
		firstSlideTimer = null;
	};

	const stopFirstSlideWait = () => {
		cancelFirstSlideWait?.();
		cancelFirstSlideWait = null;
	};

	/**
	 * 等首帧要用的那张幻灯片图片就绪。视频幻灯片、空 src 都不用等，与 useVegasState
	 * 的导航门槛共用同一个判断出口。
	 *
	 * 等待期间，`getCurrentSlideIndex()` 指向的下标本身不会变，但该下标对应的
	 * `SlideProps` 内容可能被整体替换成等长但不同的新内容（不会触发 preload/默认背景/
	 * 首帧这整套序列重跑，见 Vegas.vue 里 watch 的依赖）。就绪之后要用「当时最新」的
	 * 内容复核一遍：要等的 src 变了（含变成视频/空 src）就说明刚才等到的结果是过期的，
	 * 必须按新内容再等一轮，而不是把旧结果套在新内容上——这与 useVegasState.requestNavigation
	 * 里的过期结果检查同理，重来的次数同样有上限（见 MAX_STALE_IMAGE_RETRIES）：超限后
	 * 按当前内容放行，不再等。
	 *
	 * `isStale` 在每次 await 之后都要先查：这一轮序列若已被新一轮 runLifecycle 取代或
	 * 组件已卸载，就不能再碰 `cancelFirstSlideWait`——那已经是新一轮的取消句柄了。
	 */
	const waitForFirstSlideReady = async (isStale: () => boolean): Promise<void> => {
		let waitSrc = getSlideImageWaitSrc(getSlides()[getCurrentSlideIndex()]);

		for (let attempt = 0; waitSrc !== null && attempt <= MAX_STALE_IMAGE_RETRIES; attempt++) {
			const settledSrc = waitSrc;
			await new Promise<void>(resolve => {
				cancelFirstSlideWait = whenImageReady(settledSrc, resolve);
			});
			if (isStale()) return;
			cancelFirstSlideWait = null;

			waitSrc = getSlideImageWaitSrc(getSlides()[getCurrentSlideIndex()]);
			if (waitSrc === settledSrc) return;
		}
	};

	const enterPlaybackPhase = (targetPhase: 'playing' | 'paused') => {
		clearTimer(firstSlideTimer);
		firstSlideTimer = null;
		phase.value = targetPhase;
	};

	const play = () => {
		if (phase.value === 'paused' || phase.value === 'firstSlide') {
			clearTimer(firstSlideTimer);
			firstSlideTimer = null;
			phase.value = 'playing';
		}
	};

	const pause = () => {
		if (phase.value === 'playing' || phase.value === 'firstSlide') {
			clearTimer(firstSlideTimer);
			firstSlideTimer = null;
			phase.value = 'paused';
		}
	};

	const runLifecycle = async () => {
		const currentLifecycleId = ++lifecycleId;
		clearTimers();
		stopFirstSlideWait();
		phase.value = 'idle';

		// 首帧图片就绪等待从序列一开始就发起，与预加载 / 默认背景阶段并行进行，
		// 而不是等它们都走完才开始算——那样会把两段等待时间串行叠加。
		const firstSlideReady = waitForFirstSlideReady(() => lifecycleId !== currentLifecycleId);

		if (getPreload()) {
			log()('进入预加载阶段');
			phase.value = 'preloading';
			await preloadResources();
			if (lifecycleId !== currentLifecycleId) return;
		}

		if (getHasDefaultBackground()) {
			log()(`进入默认背景阶段，持续 ${getDefaultBackgroundDuration()}ms`);
			phase.value = 'showingDefaultBackground';

			await new Promise<void>(resolve => {
				backgroundTimer = window.setTimeout(resolve, getDefaultBackgroundDuration());
			});

			if (lifecycleId !== currentLifecycleId) return;
		}

		log()('等待首张幻灯片图片就绪');
		await firstSlideReady;
		if (lifecycleId !== currentLifecycleId) return;

		log()('进入首帧阶段');
		phase.value = 'firstSlide';

		if (getFirstTransitionDuration() <= 0) {
			enterPlaybackPhase(getAutoplay() ? 'playing' : 'paused');
			return;
		}

		firstSlideTimer = window.setTimeout(() => {
			if (lifecycleId !== currentLifecycleId) return;
			enterPlaybackPhase(getAutoplay() ? 'playing' : 'paused');
		}, getFirstTransitionDuration());
	};

	// Start lifecycle only on the client to avoid window/document access
	// during SSR and prevent hydration mismatches.
	onMounted(() => { void runLifecycle(); });

	// Re-run lifecycle when relevant props change after mount.
	// getAutoplay 故意不在依赖里：运行时切换 autoplay 只应切换播放状态
	// （由 Vegas.vue 中单独的 watch 处理），不应重走 preload/默认背景整个流程。
	watch(
		[getPreload, getHasDefaultBackground, getDefaultBackgroundDuration, getFirstTransitionDuration],
		() => {
			// 启动流程已经走完（playing/paused）后，这些输入的变化不该让已经在播放的
			// 幻灯片退回去重新走一遍 preload/默认背景/首帧序列；只有启动流程本身还
			// 没走完时才需要按新参数重跑（由 lifecycleId 取消旧序列）。
			if (phase.value === 'playing' || phase.value === 'paused') return;
			void runLifecycle();
		}
	);

	onUnmounted(() => {
		lifecycleId++;
		clearTimers();
		stopFirstSlideWait();
	});

	const isPlaying = () => phase.value === 'playing';
	const isFirstTransition = () => phase.value === 'firstSlide';
	const shouldRenderSlides = () =>
		phase.value === 'firstSlide' || phase.value === 'playing' || phase.value === 'paused';
	const showDefaultBackground = () =>
		phase.value === 'showingDefaultBackground' || phase.value === 'firstSlide';
	const isDefaultBackgroundLeaving = () => phase.value === 'firstSlide';

	return {
		phase,
		isPlaying,
		isFirstTransition,
		shouldRenderSlides,
		showDefaultBackground,
		isDefaultBackgroundLeaving,
		play,
		pause,
	};
};
