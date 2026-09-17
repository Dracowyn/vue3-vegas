import { ref, watch, onUnmounted } from 'vue';
import type { SlideProps, Logger } from '../types';
import { whenImageReady } from '../utils/imageReady';
import { getSlideImageWaitSrc, MAX_STALE_IMAGE_RETRIES } from '../utils/slideImageWait';

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

export interface UseVegasStateOptions {
	getInitialSlide: () => number;
	getSlides: () => SlideProps[];
	getLoop: () => boolean;
	getShuffle: () => boolean;
	getIsTransitioning: () => boolean;
	log: () => Logger;
	onWalk?: (index: number, slide: SlideProps) => void;
	stopPlayback?: () => void;
	onEnd?: (index: number, slide: SlideProps) => void;
	/**
	 * 真正提交（切换真的发生）时触发,而不是请求被接受/进入等待时。调用方（Vegas.vue）
	 * 用它来在正确的时机上过渡锁——图片幻灯片可能要等目标图片 load/error 后才提交,
	 * 等待期间绝不能占着锁,否则慢网下用户点什么都没反应。
	 */
	onCommit?: (index: number) => void;
}

export const useVegasState = (options: UseVegasStateOptions) => {
	const {
		getInitialSlide,
		getSlides,
		getLoop,
		getShuffle,
		getIsTransitioning,
		log,
		onWalk,
		stopPlayback,
		onEnd,
		onCommit,
	} = options;

	const currentSlide = ref(getInitialSlide());
	const slideOrder = ref<number[]>([]);
	const currentOrderIndex = ref(0);
	const visibleSlides = ref<number[]>([getInitialSlide()]);

	// 待提交的导航请求：等目标图片 load/error 才会真正提交。
	let cancelPendingWait: (() => void) | null = null;
	// 待提交被「状态重建」（initSlideOrder / handleSlidesLengthChange）打断时用来
	// 重新发起的 thunk——就是原始的 next()/previous()/goTo(index) 调用本身，
	// 重新发起时会用重建后的新状态整体重新走一遍「计划」（越界校验、重新洗牌的
	// 长度都基于新状态），而不是简单地重放旧目标下标。被「新的导航请求」取代
	// （见 requestNavigation 开头的 cancelPending）不算这种情况——那是用户意图
	// 的更替，不需要重发，所以两套「丢弃待提交请求」的逻辑分开维护。
	let pendingRetry: (() => void) | null = null;

	const stopPendingWait = () => {
		if (cancelPendingWait) {
			cancelPendingWait();
			cancelPendingWait = null;
		}
	};

	/** 新导航请求取代旧请求、或组件卸载时用：单纯丢弃，不重发 */
	const cancelPending = () => {
		stopPendingWait();
		pendingRetry = null;
	};

	/**
	 * 因为状态被重建而不得不放弃当前待提交的导航时用这个：取出重发用的 thunk 交给
	 * 调用方，调用方负责在状态重建完成之后再执行它。
	 */
	const takeoverPendingRetry = (): (() => void) | null => {
		const retry = pendingRetry;
		stopPendingWait();
		pendingRetry = null;
		return retry;
	};

	// 「目标内容已变化 → 放弃过期提交、重新发起」连续发生了几次，提交成功时清零。
	// 上限见 MAX_STALE_IMAGE_RETRIES。
	let staleRetries = 0;

	/** 真正提交一次切换：写状态、触发 onWalk 与过渡锁,是唯一改状态的入口 */
	const commit = (targetIndex: number, reshuffleOrder?: number[]) => {
		const slides = getSlides();
		staleRetries = 0;

		if (reshuffleOrder) {
			slideOrder.value = reshuffleOrder;
			currentOrderIndex.value = 0;
		} else {
			const orderIdx = slideOrder.value.indexOf(targetIndex);
			if (orderIdx >= 0) currentOrderIndex.value = orderIdx;
		}

		visibleSlides.value = [targetIndex];
		currentSlide.value = targetIndex;

		log()(`切换到幻灯片: ${targetIndex}`);
		onWalk?.(targetIndex, slides[targetIndex]);
		onCommit?.(targetIndex);
	};

	/**
	 * 规划一次导航：视频幻灯片、空 src 立即提交；否则等目标图片 load/error 才提交。
	 * `img.complete` 为真（缓存命中）时 `whenImageReady` 会同步调用回调,这里同步提交,
	 * 与原版 Vegas.js `_goto` 语义一致，也是现有调用方依赖的前提。
	 *
	 * `retry` 是这次导航对应的原始调用（`() => next()` 等），仅在待提交期间被状态重建
	 * 打断（见 takeoverPendingRetry）时才会重新执行；被新导航取代或正常提交都不需要它。
	 */
	const requestNavigation = (targetIndex: number, reshuffleOrder?: number[], retry?: () => void): boolean => {
		cancelPending();

		const waitSrc = getSlideImageWaitSrc(getSlides()[targetIndex]);
		if (waitSrc === null) {
			commit(targetIndex, reshuffleOrder);
			return true;
		}

		log()(`等待目标幻灯片图片就绪: ${waitSrc}`);

		let settledSync = false;
		const cancel = whenImageReady(waitSrc, () => {
			cancelPendingWait = null;
			pendingRetry = null;
			settledSync = true;

			// 图片就绪的这一刻，目标下标「现在」要等的 src 可能已经变了——slides 被整体
			// 替换成等长但内容不同的新数组不会改变下标，也不会触发长度变化的重建 watch，
			// 但目标幻灯片的内容已经不是当初发起等待时的那个了。这时把刚才等到的结果
			// 套在新内容上会绕过门槛（例如新内容其实要等一张完全不同的图片）,必须放弃
			// 这次过期的提交，改用 retry 按「当前」状态重新走一遍计划——新内容不需要等
			// 待就立即提交，需要等就改等新的 src，目标已不存在则由 goTo/next/previous
			// 自身的校验拒绝。重试次数有上限：「src 不再变化就会收敛」只是对使用者输入的
			// 假设，不是保证（见 MAX_STALE_IMAGE_RETRIES），超限后按当前内容直接提交。
			const currentWaitSrc = getSlideImageWaitSrc(getSlides()[targetIndex]);
			if (currentWaitSrc !== waitSrc && retry && staleRetries < MAX_STALE_IMAGE_RETRIES) {
				staleRetries += 1;
				log()(`目标幻灯片内容已变化,放弃过期的提交,按当前内容重新发起（第 ${staleRetries} 次）`);
				retry();
				return;
			}

			commit(targetIndex, reshuffleOrder);
		});

		if (!settledSync) {
			cancelPendingWait = cancel;
			pendingRetry = retry ?? null;
		}

		return true;
	};

	const rebuildSlideOrderFromScratch = () => {
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

		// When shuffled, start at orderIndex 0 (a random slide) so the
		// progress bar begins at 0%.  No need to force the initial slide
		// to the front — that would destroy the randomness for small sets.
		const nextOrderIndex = shuffle ? 0 : normalizedInitialSlide;
		const nextSlideIndex = order[nextOrderIndex] ?? normalizedInitialSlide;

		if (shuffle) {
			log()('幻灯片随机排序完成:', order);
		}

		slideOrder.value = order;
		currentOrderIndex.value = nextOrderIndex;
		currentSlide.value = nextSlideIndex;
		visibleSlides.value = [nextSlideIndex];
	};

	// `slide` / `shuffle` 变化：语义上等同于「重新开始」，整体重新初始化。取出待重发的
	// 导航、重建状态、再按新状态重新发起——不能直接 cancelPending，否则待提交的切换
	// 会悄悄消失（例如自动播放定时器已经用掉，没人会再安排下一次 next()）。
	const initSlideOrder = () => {
		const retry = takeoverPendingRetry();
		rebuildSlideOrderFromScratch();
		retry?.();
	};

	watch([getInitialSlide, getShuffle], initSlideOrder, { immediate: true });

	// 仅 `slides.length` 变化（懒加载 / 分页追加、删减）：尽量保留当前播放位置，
	// 不能复用 rebuildSlideOrderFromScratch——它总是回到 `slide` prop 指定的那张。
	const rebuildSlideOrderForLengthChange = (newLength: number, oldLength: number) => {
		if (newLength === 0) {
			slideOrder.value = [];
			currentOrderIndex.value = 0;
			visibleSlides.value = [];
			return;
		}

		// 从「没有幻灯片」变为「有幻灯片」，没有播放位置可言，走正常初始化。
		if (oldLength === 0) {
			rebuildSlideOrderFromScratch();
			return;
		}

		const clampedSlide = clampSlideIndex(currentSlide.value, newLength);
		if (clampedSlide !== currentSlide.value) {
			log()(`幻灯片数量变化,当前下标越界,钳到: ${clampedSlide}`);
			currentSlide.value = clampedSlide;
			visibleSlides.value = [clampedSlide];
		}

		if (getShuffle()) {
			// 重新洗牌以纳入新增/减少的幻灯片，但把当前这张换到第 0 位，
			// 保证不触发切换、也不会让下一次 next() 立刻重复当前这张。
			const order = buildSlideOrder(newLength, true);
			const currentPos = order.indexOf(clampedSlide);
			if (currentPos > 0) {
				[order[0], order[currentPos]] = [order[currentPos], order[0]];
			}
			slideOrder.value = order;
			currentOrderIndex.value = 0;
			log()('幻灯片数量变化,重新随机排序并保留当前播放位置:', order);
		} else {
			slideOrder.value = buildSlideOrder(newLength, false);
			currentOrderIndex.value = clampedSlide;
		}
	};

	// 与 initSlideOrder 同理：先取出待重发的导航，重建完状态再重新发起
	const handleSlidesLengthChange = (newLength: number, oldLength: number) => {
		const retry = takeoverPendingRetry();
		rebuildSlideOrderForLengthChange(newLength, oldLength);
		retry?.();
	};

	watch(() => getSlides().length, handleSlidesLengthChange);

	const goTo = (index: number) => {
		const slides = getSlides();
		if (index < 0 || index >= slides.length || getIsTransitioning() || index === currentSlide.value) {
			return false;
		}

		return requestNavigation(index, undefined, () => { goTo(index); });
	};

	const next = () => {
		if (getIsTransitioning()) {
			log()('正在切换中,跳过本次切换');
			return false;
		}

		if (slideOrder.value.length === 0) return false;

		let nextOrderIndex = currentOrderIndex.value + 1;
		let reshuffleOrder: number[] | undefined;

		if (nextOrderIndex >= slideOrder.value.length) {
			if (getLoop()) {
				log()('到达最后一张,循环回到第一张');

				// Re-shuffle on each loop so the order feels truly random.
				// Avoid starting the new cycle with the slide that just played.
				// 重新洗牌只是「计划」，此时还不写 slideOrder——真正写入延后到提交
				// （见 commit），这样被取代的计划（见 requestNavigation/cancelPending）
				// 就不会留下副作用。
				if (getShuffle()) {
					const lastSlide = currentSlide.value;
					const newOrder = buildSlideOrder(slideOrder.value.length, true);
					if (newOrder.length > 1 && newOrder[0] === lastSlide) {
						const swapIdx = 1 + Math.floor(Math.random() * (newOrder.length - 1));
						[newOrder[0], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[0]];
					}
					reshuffleOrder = newOrder;
					log()('重新随机排序(将在提交时生效):', newOrder);
				}

				nextOrderIndex = 0;
			} else {
				log()('到达最后一张,停止播放');
				// 播完的语义只属于「往后走到头」。onEnd 先于 stopPlayback 触发的
				// onPause——后者要等 phase 的 watcher 冲刷，天然排在后面。
				const lastSlide = currentSlide.value;
				onEnd?.(lastSlide, getSlides()[lastSlide]);
				stopPlayback?.();
				return false;
			}
		}

		const order = reshuffleOrder ?? slideOrder.value;
		const nextSlideIndex = order[nextOrderIndex];
		if (nextSlideIndex === currentSlide.value) return false;

		return requestNavigation(nextSlideIndex, reshuffleOrder, () => { next(); });
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
				// 与原版 Vegas.js 一致：往前走到头只是直接返回，不暂停播放
				// （停止播放的语义只属于 next 往后走到头,见 next 中的 onEnd/stopPlayback）
				log()('到达第一张,保持播放状态');
				return false;
			}
		}

		const prevSlideIndex = slideOrder.value[prevOrderIndex];
		if (prevSlideIndex === currentSlide.value) return false;

		return requestNavigation(prevSlideIndex, undefined, () => { previous(); });
	};

	onUnmounted(cancelPending);

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
