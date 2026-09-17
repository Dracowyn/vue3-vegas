import { mount } from '@vue/test-utils';
import { describe, expect, it, vi, afterEach } from 'vitest';
import Vegas from '../src/Vegas.vue';
import type { SlideProps, VegasHandle } from '../src/types';
import { advanceTimers, flushEffects } from './helpers';

const baseSlides: SlideProps[] = [
	{ src: '/change-a.jpg' },
	{ src: '/change-b.jpg' },
	{ src: '/change-c.jpg' },
];

const mountVegas = (extraProps: Record<string, unknown> = {}) => mount(Vegas, {
	props: {
		slides: baseSlides,
		autoplay: false,
		transition: 'fade',
		transitionDuration: 1000,
		firstTransitionDuration: 0,
		...extraProps,
	},
});

const handleOf = (wrapper: ReturnType<typeof mount>) =>
	wrapper.vm as unknown as VegasHandle;

const goNext = async (wrapper: ReturnType<typeof mount>) => {
	handleOf(wrapper).next();
	await flushEffects();
	await advanceTimers(1000);
};

describe('slides 长度变化时保留播放位置', () => {
	afterEach(() => {
		if (vi.isFakeTimers()) {
			vi.runOnlyPendingTimers();
			vi.useRealTimers();
		}
	});

	it('播到下标 2 后向 slides 末尾追加一张，current 保持 2 且不触发额外 onWalk', async () => {
		vi.useFakeTimers();
		const onWalk = vi.fn();
		// slide prop 保持 0，用 next() 走到下标 2，与初始 slide 解耦，
		// 这样才能确认追加后是「保留播放位置」而不是「巧合地重新落在同一处」。
		const wrapper = mountVegas({ slide: 0, onWalk });
		await flushEffects();

		await goNext(wrapper);
		await goNext(wrapper);
		expect(handleOf(wrapper).current()).toBe(2);
		const walkCountBeforeAppend = onWalk.mock.calls.length;

		await wrapper.setProps({
			slides: [...baseSlides, { src: '/change-d.jpg' }],
		});
		await flushEffects();

		expect(handleOf(wrapper).current()).toBe(2);
		expect(onWalk.mock.calls.length).toBe(walkCountBeforeAppend);

		// 追加后应该能继续走到新追加的下标 3
		await goNext(wrapper);

		expect(handleOf(wrapper).current()).toBe(3);
		expect(onWalk).toHaveBeenCalledWith(3, { src: '/change-d.jpg' });
	});

	it('追加后继续 next 到头再循环，走完一整轮回到下标 0', async () => {
		vi.useFakeTimers();
		const wrapper = mountVegas({ slide: 0 });
		await flushEffects();

		await goNext(wrapper);
		await goNext(wrapper);
		expect(handleOf(wrapper).current()).toBe(2);

		await wrapper.setProps({
			slides: [...baseSlides, { src: '/change-d.jpg' }],
		});
		await flushEffects();
		expect(handleOf(wrapper).current()).toBe(2);

		await goNext(wrapper);
		expect(handleOf(wrapper).current()).toBe(3);

		// 到达最后一张(下标3)，loop 默认开启，下一次应回到下标 0
		await goNext(wrapper);
		expect(handleOf(wrapper).current()).toBe(0);
	});

	it('删减 slides 导致当前下标越界时，钳到最后一张有效下标', async () => {
		vi.useFakeTimers();
		const wrapper = mountVegas({ slide: 0 });
		await flushEffects();

		await goNext(wrapper);
		await goNext(wrapper);
		expect(handleOf(wrapper).current()).toBe(2);

		await wrapper.setProps({
			slides: baseSlides.slice(0, 2),
		});
		await flushEffects();

		expect(handleOf(wrapper).current()).toBe(1);
		expect(wrapper.find(`img[src="${baseSlides[1].src}"]`).exists()).toBe(true);
	});

	it('slides 从 0 变为非 0 时走正常初始化', async () => {
		vi.useFakeTimers();
		const wrapper = mountVegas({ slides: [], slide: 0 });
		await flushEffects();

		expect(wrapper.find('.vue3-vegas-root').exists()).toBe(false);

		await wrapper.setProps({ slides: baseSlides });
		await flushEffects();

		expect(handleOf(wrapper).current()).toBe(0);
	});

	it('slides 变为空数组时清空播放状态', async () => {
		vi.useFakeTimers();
		const wrapper = mountVegas({ slide: 1 });
		await flushEffects();

		expect(handleOf(wrapper).current()).toBe(1);

		await wrapper.setProps({ slides: [] });
		await flushEffects();

		expect(wrapper.find('.vue3-vegas-root').exists()).toBe(false);
	});

	it('修改 slide prop 时仍然整体重置（不受长度变化保留逻辑影响）', async () => {
		vi.useFakeTimers();
		const wrapper = mountVegas({ slide: 1 });
		await flushEffects();

		await goNext(wrapper);
		expect(handleOf(wrapper).current()).toBe(2);

		await wrapper.setProps({ slide: 0 });
		await flushEffects();

		expect(handleOf(wrapper).current()).toBe(0);
	});

	it('shuffle 模式下追加幻灯片，current 不变且一整轮内每张恰好播到一次', async () => {
		vi.useFakeTimers();
		// 固定 Math.random，使洗牌结果可预期，避免「巧合地落在同一下标」掩盖 bug。
		const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);

		const wrapper = mountVegas({ shuffle: true, slide: 0 });
		await flushEffects();

		// 走一步，让当前下标与「初始 slide / 洗牌后第 0 位」解耦
		await goNext(wrapper);
		const preserved = handleOf(wrapper).current();

		await wrapper.setProps({
			slides: [...baseSlides, { src: '/change-d.jpg' }],
		});
		await flushEffects();

		expect(handleOf(wrapper).current()).toBe(preserved);

		const seen = new Set<number>([preserved]);
		for (let i = 0; i < 3; i++) {
			await goNext(wrapper);
			seen.add(handleOf(wrapper).current());
		}

		expect(seen.size).toBe(4);
		expect([...seen].sort()).toEqual([0, 1, 2, 3]);

		randomSpy.mockRestore();
	});
});
