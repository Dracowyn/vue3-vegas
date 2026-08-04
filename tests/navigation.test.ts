import { mount } from '@vue/test-utils';
import { describe, expect, it, vi, afterEach } from 'vitest';
import Vegas from '../src/Vegas.vue';
import type { SlideProps, VegasHandle } from '../src/types';
import { advanceTimers, flushEffects } from './helpers';

const slides: SlideProps[] = [
	{ src: '/nav-a.jpg' },
	{ src: '/nav-b.jpg' },
	{ src: '/nav-c.jpg' },
];

const isSlideVisible = (wrapper: ReturnType<typeof mount>, source: string) =>
	wrapper.find(`img[src="${source}"]`).exists();

const mountVegas = (extraProps: Record<string, unknown> = {}) => mount(Vegas, {
	props: {
		slides,
		autoplay: false,
		transition: 'fade',
		transitionDuration: 1000,
		firstTransitionDuration: 0,
		...extraProps,
	},
});

const handleOf = (wrapper: ReturnType<typeof mount>) =>
	wrapper.vm as unknown as VegasHandle;

describe('手动导航 goTo / current / onWalk', () => {
	afterEach(() => {
		if (vi.isFakeTimers()) {
			vi.runOnlyPendingTimers();
			vi.useRealTimers();
		}
	});

	it('goTo 切换到指定下标并返回 true', async () => {
		vi.useFakeTimers();
		const wrapper = mountVegas();
		await flushEffects();

		expect(handleOf(wrapper).goTo(2)).toBe(true);
		await flushEffects();

		expect(isSlideVisible(wrapper, '/nav-c.jpg')).toBe(true);
	});

	it('goTo 可以直接跳回更靠前的幻灯片', async () => {
		vi.useFakeTimers();
		const wrapper = mountVegas();
		await flushEffects();

		handleOf(wrapper).goTo(2);
		// 释放锁的 setTimeout 由 pre-flush watcher 注册，先冲刷再推进定时器
		await flushEffects();
		await advanceTimers(1000);

		expect(handleOf(wrapper).goTo(0)).toBe(true);
		await flushEffects();

		expect(isSlideVisible(wrapper, '/nav-a.jpg')).toBe(true);
	});

	it('goTo 到当前幻灯片或越界下标时返回 false', async () => {
		vi.useFakeTimers();
		const wrapper = mountVegas();
		await flushEffects();

		const handle = handleOf(wrapper);
		expect(handle.goTo(0)).toBe(false);
		expect(handle.goTo(-1)).toBe(false);
		expect(handle.goTo(3)).toBe(false);
	});

	it('切换动画进行中时 goTo 被忽略', async () => {
		vi.useFakeTimers();
		const wrapper = mountVegas();
		await flushEffects();

		const handle = handleOf(wrapper);
		expect(handle.goTo(1)).toBe(true);
		await flushEffects();

		// 锁仍被持有，第二次跳转应被丢弃
		expect(handle.goTo(2)).toBe(false);
		await flushEffects();
		expect(isSlideVisible(wrapper, '/nav-c.jpg')).toBe(false);

		// 锁释放后可以继续跳转
		await advanceTimers(1000);
		expect(handle.goTo(2)).toBe(true);
		await flushEffects();
		expect(isSlideVisible(wrapper, '/nav-c.jpg')).toBe(true);
	});

	it('current 返回当前幻灯片下标，并随 goTo / next 更新', async () => {
		vi.useFakeTimers();
		const wrapper = mountVegas({ slide: 1 });
		await flushEffects();

		const handle = handleOf(wrapper);
		expect(handle.current()).toBe(1);

		handle.next();
		await flushEffects();
		await advanceTimers(1000);
		expect(handle.current()).toBe(2);

		handle.goTo(0);
		await flushEffects();
		expect(handle.current()).toBe(0);
	});

	it('onWalk 收到目标幻灯片的下标与配置', async () => {
		vi.useFakeTimers();
		const onWalk = vi.fn();
		const wrapper = mountVegas({ onWalk });
		await flushEffects();

		// 首屏渲染不算一次切换
		expect(onWalk).not.toHaveBeenCalled();

		handleOf(wrapper).goTo(2);
		await flushEffects();

		expect(onWalk).toHaveBeenCalledTimes(1);
		expect(onWalk).toHaveBeenCalledWith(2, slides[2]);
	});

	it('onWalk 在挂载后替换也能生效', async () => {
		vi.useFakeTimers();
		const first = vi.fn();
		const second = vi.fn();
		const wrapper = mountVegas({ onWalk: first });
		await flushEffects();

		await wrapper.setProps({ onWalk: second });
		handleOf(wrapper).goTo(1);
		await flushEffects();

		expect(first).not.toHaveBeenCalled();
		expect(second).toHaveBeenCalledWith(1, slides[1]);
	});

	it('shuffle 下 current 返回真实幻灯片下标而非播放顺序位置', async () => {
		vi.useFakeTimers();
		const wrapper = mountVegas({ shuffle: true });
		await flushEffects();

		const handle = handleOf(wrapper);
		const index = handle.current();
		expect(Number.isInteger(index)).toBe(true);
		expect(index).toBeGreaterThanOrEqual(0);
		expect(index).toBeLessThan(slides.length);
		expect(isSlideVisible(wrapper, slides[index].src)).toBe(true);
	});
});
