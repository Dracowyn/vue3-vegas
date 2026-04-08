import { ref, watch } from 'vue';
import type { SlideProps, Logger } from '../types';

const buildSlideOrder = (length: number, shuffle: boolean) => {
	const order = Array.from({ length }, (_, index) => index);

	if (shuffle) {
		for (let index = order.length - 1; index > 0; index--) {
			const randomIndex = Math.floor(Math.random() * (index + 1));
			[order[index], order[randomIndex]] = [order[randomIndex], order[index]];
		}
	}

	return order;
};

const clampSlideIndex = (index: number, length: number) => {
	if (length === 0) return 0;
	return Math.min(Math.max(index, 0), length - 1);
};

export const useVegasState = (
	getInitialSlide: () => number,
	getSlides: () => SlideProps[],
	getLoop: () => boolean,
	getShuffle: () => boolean,
	getIsTransitioning: () => boolean,
	log: () => Logger,
	onWalk?: () => void,
	stopPlayback?: () => void
) => {
	const currentSlide = ref(getInitialSlide());
	const slideOrder = ref<number[]>([]);
	const currentOrderIndex = ref(0);
	const visibleSlides = ref<number[]>([getInitialSlide()]);

	const initSlideOrder = () => {
		const slides = getSlides();
		if (slides.length === 0) {
			slideOrder.value = [];
			currentOrderIndex.value = 0;
			visibleSlides.value = [];
			return;
		}

		const shuffle = getShuffle();
		const order = buildSlideOrder(slides.length, shuffle);
		const normalizedInitialSlide = clampSlideIndex(getInitialSlide(), slides.length);
		const initialOrderIndex = shuffle ? order.indexOf(normalizedInitialSlide) : normalizedInitialSlide;
		const nextOrderIndex = initialOrderIndex >= 0 ? initialOrderIndex : 0;
		const nextSlideIndex = order[nextOrderIndex] ?? normalizedInitialSlide;

		if (shuffle) {
			log()('幻灯片随机排序完成:', order);
		}

		slideOrder.value = order;
		currentOrderIndex.value = nextOrderIndex;
		currentSlide.value = nextSlideIndex;
		visibleSlides.value = [nextSlideIndex];
	};

	watch([getInitialSlide, getShuffle, () => getSlides().length], initSlideOrder, { immediate: true });

	const goTo = (index: number) => {
		const slides = getSlides();
		if (index < 0 || index >= slides.length || getIsTransitioning() || index === currentSlide.value) {
			return false;
		}

		log()(`切换到幻灯片: ${index}`);
		visibleSlides.value = [index];
		currentSlide.value = index;

		const nextOrderIndex = slideOrder.value.indexOf(index);
		if (nextOrderIndex >= 0) {
			currentOrderIndex.value = nextOrderIndex;
		}

		onWalk?.();
		return true;
	};

	const next = () => {
		if (getIsTransitioning()) {
			log()('正在切换中,跳过本次切换');
			return false;
		}

		if (slideOrder.value.length === 0) return false;

		let nextOrderIndex = currentOrderIndex.value + 1;
		if (nextOrderIndex >= slideOrder.value.length) {
			if (getLoop()) {
				nextOrderIndex = 0;
				log()('到达最后一张,循环回到第一张');
			} else {
				log()('到达最后一张,停止播放');
				stopPlayback?.();
				return false;
			}
		}

		const nextSlideIndex = slideOrder.value[nextOrderIndex];
		return goTo(nextSlideIndex);
	};

	const previous = () => {
		if (getIsTransitioning()) {
			log()('正在切换中,跳过本次切换');
			return false;
		}

		if (slideOrder.value.length === 0) return false;

		let prevOrderIndex = currentOrderIndex.value - 1;
		if (prevOrderIndex < 0) {
			if (getLoop()) {
				prevOrderIndex = slideOrder.value.length - 1;
				log()('到达第一张,循环到最后一张');
			} else {
				log()('到达第一张,停止播放');
				stopPlayback?.();
				return false;
			}
		}

		const prevSlideIndex = slideOrder.value[prevOrderIndex];
		return goTo(prevSlideIndex);
	};

	return {
		currentSlide,
		slideOrder,
		currentOrderIndex,
		visibleSlides,
		next,
		previous,
		goTo,
	};
};
