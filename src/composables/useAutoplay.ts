import { watch, onUnmounted } from 'vue';
import type { Logger } from '../types';

export const useAutoplay = (
	getIsPlaying: () => boolean,
	getIsTransitioning: () => boolean,
	getCurrentSlide: () => number,
	getSlideCount: () => number,
	/** 当前幻灯片的有效停留时长（已解析好 slide.delay、全局 delay 与 'video' 兜底上限） */
	getCurrentDelay: () => number,
	next: () => void,
	log: () => Logger
) => {
	let timer: number | null = null;

	const clearAutoplayTimer = () => {
		if (timer !== null) {
			clearTimeout(timer);
			timer = null;
		}
	};

	watch(
		[getIsPlaying, getIsTransitioning, getCurrentSlide, getCurrentDelay],
		() => {
			clearAutoplayTimer();

			if (!getIsPlaying() || getIsTransitioning()) return;

			const slideCount = getSlideCount();
			if (getCurrentSlide() >= slideCount) return;

			// 原版 noshow 语义：只有一张幻灯片时没有可切换的目标,
			// 不安排定时器,避免空转以及 loop:false 时凭空触发 onEnd
			if (slideCount < 2) return;

			const currentDelay = getCurrentDelay();
			log()(`设置自动播放定时器,延迟: ${currentDelay}ms`);

			timer = window.setTimeout(() => {
				next();
			}, currentDelay);
		},
		{ immediate: true }
	);

	onUnmounted(clearAutoplayTimer);
};
