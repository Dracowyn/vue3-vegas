import { flushPromises } from '@vue/test-utils';
import { nextTick, ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import { useVideoAdvance } from '../src/composables/useVideoAdvance';
import type { VegasPhase } from '../src/types';

/**
 * useVideoAdvance 是纯粹的编排决策：给定「当前幻灯片下标」「播放阶段」以及两个判定函数
 * （是否播完再切、视频是否 loop），决定 video-ended / video-failed 事件要不要真的调 next()。
 * 直接单测它，比经由完整的 Vegas + VegasSlideRenderer 挂载更精确地钉住这套决策本身——
 * 不依赖「已卸载组件 emit 是空操作」这类 Vue 实现细节（见任务说明）。
 */
const setup = (advanceOnEnded: (index: number) => boolean, loop: (index: number) => boolean) => {
	const currentSlide = ref(0);
	const phase = ref<VegasPhase>('playing');
	const next = vi.fn();
	const noop = () => {};

	const { handleVideoEnded, handleVideoFailed } = useVideoAdvance({
		getCurrentSlide: () => currentSlide.value,
		getPhase: () => phase.value,
		getAdvanceOnEnded: advanceOnEnded,
		getVideoLoop: loop,
		next,
		log: () => noop,
	});

	return { currentSlide, phase, next, handleVideoEnded, handleVideoFailed };
};

/** 触发 next() 的那个 watch 用了 flush: 'post'（原因见 useVideoAdvance.ts 注释），需要冲刷一轮才能观察到 */
const flush = async () => {
	await flushPromises();
	await nextTick();
};

describe('useVideoAdvance', () => {
	it('忽略非当前幻灯片上报的 video-ended', () => {
		const { handleVideoEnded, next } = setup(() => true, () => true);

		handleVideoEnded(1);

		expect(next).not.toHaveBeenCalled();
	});

	it('忽略非当前幻灯片上报的 video-failed', () => {
		const { handleVideoFailed, next } = setup(() => true, () => true);

		handleVideoFailed(1);

		expect(next).not.toHaveBeenCalled();
	});

	it('phase 非 playing 时，ended 被挂起，进入 playing 后才切', async () => {
		const { phase, handleVideoEnded, next } = setup(() => true, () => true);
		phase.value = 'paused';

		handleVideoEnded(0);
		expect(next).not.toHaveBeenCalled();

		phase.value = 'playing';
		await flush();

		expect(next).toHaveBeenCalledTimes(1);
	});

	it('挂起期间当前幻灯片变了，则该次挂起作废', async () => {
		const { currentSlide, phase, handleVideoEnded, next } = setup(() => true, () => true);
		phase.value = 'paused';

		handleVideoEnded(0);
		expect(next).not.toHaveBeenCalled();

		// 挂起还没兑现，当前幻灯片先变了（例如用户手动 goTo 到别的幻灯片）
		currentSlide.value = 1;
		phase.value = 'playing';
		await flush();

		expect(next).not.toHaveBeenCalled();
	});

	it("视频配了 loop:false 时 ended 会切，默认 loop 的不会切（即便都不是「播完再切」）", () => {
		const advanceOnEnded = () => false;

		const notLooping = setup(advanceOnEnded, () => false);
		notLooping.handleVideoEnded(0);
		expect(notLooping.next).toHaveBeenCalledTimes(1);

		const looping = setup(advanceOnEnded, () => true);
		looping.handleVideoEnded(0);
		expect(looping.next).not.toHaveBeenCalled();
	});

	it('video-failed 只对「播完再切」的幻灯片生效，loop:false 但非播完再切的不会因失败而切', () => {
		const { handleVideoFailed, next } = setup(() => false, () => false);

		handleVideoFailed(0);

		expect(next).not.toHaveBeenCalled();
	});

	it('video-failed 对「播完再切」的幻灯片会切走', () => {
		const { handleVideoFailed, next } = setup(() => true, () => true);

		handleVideoFailed(0);

		expect(next).toHaveBeenCalledTimes(1);
	});
});
