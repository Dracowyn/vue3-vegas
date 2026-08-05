import { watch, onUnmounted } from 'vue';
import type { SlideProps, Logger } from '../types';

export const useAutoplay = (
	getIsPlaying: () => boolean,
	getIsTransitioning: () => boolean,
	getCurrentSlide: () => number,
	getSlides: () => SlideProps[],
	getDelay: () => number,
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
		[getIsPlaying, getIsTransitioning, getCurrentSlide, getDelay],
		() => {
			clearAutoplayTimer();

			if (!getIsPlaying() || getIsTransitioning()) return;

			const slides = getSlides();
			const currentSlide = getCurrentSlide();
			if (!slides[currentSlide]) return;

			// 原版 noshow 语义：只有一张幻灯片时没有可切换的目标,
			// 不安排定时器,避免空转以及 loop:false 时凭空触发 onEnd
			if (slides.length < 2) return;

			const currentDelay = slides[currentSlide].delay ?? getDelay();
			log()(`设置自动播放定时器,延迟: ${currentDelay}ms`);

			timer = window.setTimeout(() => {
				next();
			}, currentDelay);
		},
		{ immediate: true }
	);

	onUnmounted(clearAutoplayTimer);
};
