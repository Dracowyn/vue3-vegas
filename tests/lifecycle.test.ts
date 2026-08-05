import { mount } from '@vue/test-utils';
import { describe, expect, it, vi, afterEach } from 'vitest';
import Vegas from '../src/Vegas.vue';
import type { SlideProps, VegasHandle } from '../src/types';
import { advanceTimers, flushEffects } from './helpers';

const slides: SlideProps[] = [
	{ src: '/lc-a.jpg' },
	{ src: '/lc-b.jpg' },
];

const handleOf = (wrapper: ReturnType<typeof mount>) =>
	wrapper.vm as unknown as VegasHandle;

const isSlideVisible = (wrapper: ReturnType<typeof mount>, source: string) =>
	wrapper.find(`img[src="${source}"]`).exists();

const isDefaultBackgroundVisible = (wrapper: ReturnType<typeof mount>, source: string) =>
	wrapper.findAll('div').some(node =>
		(node.element as HTMLDivElement).style.backgroundImage?.includes(source)
	);

describe('运行时 prop 变化', () => {
	afterEach(() => {
		if (vi.isFakeTimers()) {
			vi.runOnlyPendingTimers();
			vi.useRealTimers();
		}
	});

	it('切换 autoplay 只影响播放状态，不重启生命周期', async () => {
		vi.useFakeTimers();
		const wrapper = mount(Vegas, {
			props: {
				slides,
				autoplay: true,
				delay: 5000,
				transitionDuration: 100,
				firstTransitionDuration: 0,
				defaultBackground: '/lc-bg.jpg',
				defaultBackgroundDuration: 1000,
			},
		});
		await flushEffects();
		await advanceTimers(1000);

		const handle = handleOf(wrapper);
		expect(isSlideVisible(wrapper, '/lc-a.jpg')).toBe(true);
		expect(handle.playing()).toBe(true);

		await wrapper.setProps({ autoplay: false });
		await flushEffects();

		// 只暂停：幻灯片保持挂载，不允许退回默认背景阶段重来一遍
		expect(handle.playing()).toBe(false);
		expect(isSlideVisible(wrapper, '/lc-a.jpg')).toBe(true);
		expect(isDefaultBackgroundVisible(wrapper, '/lc-bg.jpg')).toBe(false);

		await wrapper.setProps({ autoplay: true });
		await flushEffects();
		expect(handle.playing()).toBe(true);
	});

	it('运行时缩短 delay 对当前幻灯片立即生效', async () => {
		vi.useFakeTimers();
		const wrapper = mount(Vegas, {
			props: {
				slides,
				autoplay: true,
				delay: 60000,
				transitionDuration: 100,
				firstTransitionDuration: 0,
			},
		});
		await flushEffects();

		await wrapper.setProps({ delay: 300 });
		await flushEffects();
		await advanceTimers(300);

		expect(isSlideVisible(wrapper, '/lc-b.jpg')).toBe(true);
	});
});

describe('首帧过渡时长默认值', () => {
	afterEach(() => {
		if (vi.isFakeTimers()) {
			vi.runOnlyPendingTimers();
			vi.useRealTimers();
		}
	});

	it('未设置 firstTransitionDuration 时回退到 transitionDuration（原版语义）', async () => {
		vi.useFakeTimers();
		const wrapper = mount(Vegas, {
			props: {
				slides,
				autoplay: true,
				delay: 5000,
				transitionDuration: 200,
				// 故意不设 firstTransitionDuration
			},
		});
		await flushEffects();

		const handle = handleOf(wrapper);
		// 首帧进行中
		expect(handle.playing()).toBe(false);

		// 首帧应只持续 transitionDuration(200ms)，而不是旧的固定 3000ms
		await advanceTimers(200);
		expect(handle.playing()).toBe(true);

		// 首帧的过渡时长也应是 200ms
		const slideEl = wrapper.find('[data-transition-duration]');
		expect(slideEl.attributes('data-transition-duration')).toBe('200');
	});
});

describe('单张幻灯片', () => {
	afterEach(() => {
		if (vi.isFakeTimers()) {
			vi.runOnlyPendingTimers();
			vi.useRealTimers();
		}
	});

	it('不安排自动播放定时器，loop 关闭时也不会凭空触发 onEnd', async () => {
		vi.useFakeTimers();
		const onEnd = vi.fn();
		const onPause = vi.fn();
		const wrapper = mount(Vegas, {
			props: {
				slides: [slides[0]],
				autoplay: true,
				loop: false,
				delay: 5000,
				firstTransitionDuration: 0,
				onEnd,
				onPause,
			},
		});
		await flushEffects();

		// 走过好几个 delay 周期
		await advanceTimers(20000);

		expect(onEnd).not.toHaveBeenCalled();
		expect(onPause).not.toHaveBeenCalled();
		expect(isSlideVisible(wrapper, '/lc-a.jpg')).toBe(true);
	});
});
