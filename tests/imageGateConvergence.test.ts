import { mount } from '@vue/test-utils';
import { describe, expect, it, vi, afterEach } from 'vitest';
import Vegas from '../src/Vegas.vue';
import type { SlideProps, VegasHandle } from '../src/types';
import { getTransitionHandlers } from '../src/effects/transitionHandlers';
import { advanceTimers, flushEffects } from './helpers';

const handleOf = (wrapper: ReturnType<typeof mount>) =>
	wrapper.vm as unknown as VegasHandle;

/**
 * 一张「每次读取 src 都返回不同值」的幻灯片（例如使用者在 getter 里拼时间戳做 cache-busting）。
 * 图片就绪后的「过期复核」会因此永远对不上——复核必须有上限，不能无限重试。
 * 这里用 tests/setup.ts 的默认假 Image（complete 恒为 true，同步就绪），正是最坏情况：
 * 导航那一侧会同步递归到栈溢出，首帧那一侧会在微任务里空转到饿死事件循环。
 */
const createUnstableSlide = (prefix: string): SlideProps => {
	let reads = 0;
	return {
		get src() {
			reads += 1;
			return `${prefix}-${reads}.jpg`;
		},
	} as SlideProps;
};

describe('图片就绪复核必须收敛', () => {
	afterEach(() => {
		if (vi.isFakeTimers()) {
			vi.runOnlyPendingTimers();
			vi.useRealTimers();
		}
	});

	it('目标幻灯片的 src 每次读取都不同：next() 不会栈溢出，超过重试上限后按当前内容提交', async () => {
		vi.useFakeTimers();
		const onWalk = vi.fn();
		const wrapper = mount(Vegas, {
			props: {
				slides: [{ src: '/stable-a.jpg' }, createUnstableSlide('/unstable-b')],
				autoplay: false,
				transitionDuration: 100,
				onWalk,
			},
		});
		await flushEffects();
		await advanceTimers(100);

		expect(() => handleOf(wrapper).next()).not.toThrow();
		expect(handleOf(wrapper).current()).toBe(1);
		expect(onWalk).toHaveBeenCalledTimes(1);

		wrapper.unmount();
	});

	it('首张幻灯片的 src 每次读取都不同：启动流程不会卡死，照常进入首帧', async () => {
		vi.useFakeTimers();
		const wrapper = mount(Vegas, {
			props: {
				slides: [createUnstableSlide('/unstable-first'), { src: '/stable-b.jpg' }],
				autoplay: false,
				transitionDuration: 100,
			},
		});
		await flushEffects();

		expect(wrapper.find('img').exists()).toBe(true);

		wrapper.unmount();
	});
});

describe('过渡预设查找不走原型链', () => {
	it.each(['toString', 'constructor', 'valueOf', 'hasOwnProperty'])(
		'登记的自定义过渡名「%s」按 CSS 类模式处理，而不是把 Object.prototype 上的成员当成预设',
		(name) => {
			vi.useFakeTimers();
			const el = document.createElement('div');
			const done = vi.fn();

			expect(() => getTransitionHandlers(name, 100).onEnter(el, done)).not.toThrow();
			expect(el.classList.contains(`vegas-transition-${name}`)).toBe(true);

			vi.advanceTimersByTime(100);
			expect(done).toHaveBeenCalledTimes(1);
			vi.useRealTimers();
		}
	);
});
