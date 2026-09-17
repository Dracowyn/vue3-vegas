import { ref, watch } from 'vue';
import type { Logger, VegasPhase } from '../types';

/**
 * 编排层：决定「视频播完 / 放不出来」时是否、以及何时切到下一张。
 * VegasSlideRenderer 只上报事实（video-ended / video-failed 事件带 index），
 * 这里统一按当前幻灯片下标与播放阶段把关，取代原先散在渲染器里的 pendingAdvance 逻辑。
 */
export interface UseVideoAdvanceOptions {
	getCurrentSlide: () => number;
	getPhase: () => VegasPhase;
	/** 该张是否「播完再切」（delay: 'video' 且确为视频、且有下一张可切，即 Vegas.vue 的 getAdvanceOnEnded） */
	getAdvanceOnEnded: (index: number) => boolean;
	/** 该张视频配置是否 loop（必须经 resolveSlideVideo 归一化后的结果，默认 true） */
	getVideoLoop: (index: number) => boolean;
	next: () => void;
	log: () => Logger;
}

export const useVideoAdvance = (options: UseVideoAdvanceOptions) => {
	const { getCurrentSlide, getPhase, getAdvanceOnEnded, getVideoLoop, next, log } = options;

	// 播完时可能还不能切（例如短视频在首帧过渡期间就播完了），记下下标等 phase 变
	// 'playing' 再切；当前幻灯片一旦变了（不论什么原因），这张挂起的记录就作废。
	// 用 ref 而不是闭包变量：下面要拿它当 watch 依赖源之一。
	const pendingIndex = ref<number | null>(null);

	// 用「条件是否成立」而不是 phase / currentSlide 的原始值做依赖：pendingIndex 从 null 变成
	// 非 null，本身就会让这个布尔条件从 false 翻到 true，不需要 phase 在一次批处理的首尾不同——
	// 曾经用过的 flush:'sync' 方案反而会让 next() 在触发它的那次赋值（大多是 useVegasLifecycle
	// 里的 `phase.value = 'playing'`）的调用栈内同步执行，抢在 Vegas.vue「onPlay/onPause」
	// watcher（pre-flush，DOM 更新前）前面提交切换，导致 onPlay 读到已经切换后的下标、
	// 回调顺序也变成 onWalk 先于 onPlay——这正是要保持不变的行为（tests/videoDelay.test.ts
	// 「回调顺序：首帧挂起的视频切换不能抢在 onPlay 前面」钉住）。
	//
	// 这里用 flush: 'post'，不是默认的 'pre'：Vue 保证同一轮更新里所有 pre-flush watcher
	// （包括 Vegas.vue 的 onPlay/onPause watch）与组件重新渲染都先跑完，post-flush watcher
	// 才会执行——这是 Vue 文档明确承诺的顺序，不依赖「本 composable 的 watch() 调用点写在
	// Vegas.vue 源码里的第几行」这种脆弱的隐式时序（同一批 pre-flush watcher 之间的相对顺序
	// 并不单纯是「谁先调用 watch() 谁先跑」，实测过按创建顺序摆放两种写法结果一样，说明真正
	// 起作用的不是源码顺序）。用 post 把这件事显式钉死，谁调整了 Vegas.vue 里两个 watch 的
	// 先后位置都不会影响这里的正确性。
	watch(
		() => pendingIndex.value !== null
			&& getPhase() === 'playing'
			&& pendingIndex.value === getCurrentSlide(),
		(shouldAdvance) => {
			if (!shouldAdvance) return;
			pendingIndex.value = null;
			log()('视频已提前结束,切换到下一张');
			next();
		},
		{ flush: 'post' }
	);

	// 当前幻灯片一旦变了（不论是这里触发的 next()，还是外部 goTo / previous 等），
	// 挂起的记录就作废——它只对「记录当下这一张」有意义。
	watch(getCurrentSlide, () => {
		pendingIndex.value = null;
	});

	const tryAdvance = (index: number, reason: string) => {
		if (getPhase() === 'playing') {
			pendingIndex.value = null;
			log()(`${reason},切换到下一张`);
			next();
			return;
		}
		pendingIndex.value = index;
	};

	/** 该张是否该在 ended 时切走：播完再切，或者视频本身配了 loop:false（否则 ended 不会再触发） */
	const shouldAdvanceOnEnded = (index: number) => getAdvanceOnEnded(index) || !getVideoLoop(index);

	const handleVideoEnded = (index: number) => {
		if (index !== getCurrentSlide()) return;

		if (!shouldAdvanceOnEnded(index)) {
			if (pendingIndex.value === index) pendingIndex.value = null;
			return;
		}

		tryAdvance(index, '视频播放结束');
	};

	/** 视频放不出来（所有源加载失败 / 播放途中出错）：只有「播完再切」的幻灯片才切走 */
	const handleVideoFailed = (index: number) => {
		if (index !== getCurrentSlide()) return;
		if (!getAdvanceOnEnded(index)) return;

		tryAdvance(index, '视频无法播放');
	};

	return {
		handleVideoEnded,
		handleVideoFailed,
	};
};
