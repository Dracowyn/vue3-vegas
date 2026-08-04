import { mount } from '@vue/test-utils';
import { describe, expect, it, vi, afterEach } from 'vitest';
import Vegas from '../src/Vegas.vue';
import type { SlideProps, VegasHandle } from '../src/types';
import { advanceTimers, flushEffects } from './helpers';

const slides: SlideProps[] = [
	{ src: '/cb-a.jpg' },
	{ src: '/cb-b.jpg' },
];

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

describe('onEnd 回调', () => {
	afterEach(() => {
		if (vi.isFakeTimers()) {
			vi.runOnlyPendingTimers();
			vi.useRealTimers();
		}
	});

	it('loop 关闭时播完最后一张触发，携带仍在显示的那一张', async () => {
		vi.useFakeTimers();
		const onEnd = vi.fn();
		const wrapper = mountVegas({ loop: false, onEnd });
		await flushEffects();

		const handle = handleOf(wrapper);
		handle.next();
		await flushEffects();
		await advanceTimers(1000);
		expect(onEnd).not.toHaveBeenCalled();

		// 已经在最后一张，再 next 就是播完了
		expect(handle.next()).toBe(false);
		await flushEffects();

		expect(onEnd).toHaveBeenCalledTimes(1);
		// 上游此处传的是越界下标与 undefined，我们传仍在显示的最后一张
		expect(onEnd).toHaveBeenCalledWith(1, slides[1]);
	});

	it('loop 开启时回绕不触发', async () => {
		vi.useFakeTimers();
		const onEnd = vi.fn();
		const wrapper = mountVegas({ loop: true, onEnd });
		await flushEffects();

		const handle = handleOf(wrapper);
		handle.next();
		await flushEffects();
		await advanceTimers(1000);
		handle.next();
		await flushEffects();
		await advanceTimers(1000);

		expect(handle.current()).toBe(0);
		expect(onEnd).not.toHaveBeenCalled();
	});

	it('在第一张往回退不触发（与上游一致，previous 到头不算播完）', async () => {
		vi.useFakeTimers();
		const onEnd = vi.fn();
		const wrapper = mountVegas({ loop: false, onEnd });
		await flushEffects();

		expect(handleOf(wrapper).previous()).toBe(false);
		await flushEffects();

		expect(onEnd).not.toHaveBeenCalled();
	});

	it('播完后仍会触发 onPause，且顺序在 onEnd 之后', async () => {
		vi.useFakeTimers();
		const calls: string[] = [];
		const wrapper = mountVegas({
			loop: false,
			autoplay: true,
			firstTransitionDuration: 10,
			onEnd: () => calls.push('end'),
			onPause: () => calls.push('pause'),
		});
		await flushEffects();
		await advanceTimers(10);

		const handle = handleOf(wrapper);
		handle.next();
		await flushEffects();
		await advanceTimers(1000);
		handle.next();
		await flushEffects();

		expect(calls).toEqual(['end', 'pause']);
	});

	it('没有幻灯片时不触发', async () => {
		vi.useFakeTimers();
		const onEnd = vi.fn();
		const onPlay = vi.fn();
		mountVegas({ slides: [], loop: false, autoplay: true, onEnd, onPlay });
		await flushEffects();
		await advanceTimers(100);

		expect(onEnd).not.toHaveBeenCalled();
		expect(onPlay).not.toHaveBeenCalled();
	});
});

describe('onPlay / onPause 携带下标与配置', () => {
	afterEach(() => {
		if (vi.isFakeTimers()) {
			vi.runOnlyPendingTimers();
			vi.useRealTimers();
		}
	});

	it('onPlay 收到当前幻灯片的下标与配置', async () => {
		vi.useFakeTimers();
		const onPlay = vi.fn();
		mountVegas({ autoplay: true, slide: 1, onPlay });
		await flushEffects();

		expect(onPlay).toHaveBeenCalledWith(1, slides[1]);
	});

	it('onPause 收到当前幻灯片的下标与配置', async () => {
		vi.useFakeTimers();
		const onPause = vi.fn();
		const wrapper = mountVegas({ autoplay: true, onPause });
		await flushEffects();

		handleOf(wrapper).pause();
		await flushEffects();

		expect(onPause).toHaveBeenCalledWith(0, slides[0]);
	});
});

describe('playing / toggle', () => {
	afterEach(() => {
		if (vi.isFakeTimers()) {
			vi.runOnlyPendingTimers();
			vi.useRealTimers();
		}
	});

	it('playing 反映自动播放状态', async () => {
		vi.useFakeTimers();
		const wrapper = mountVegas({ autoplay: true });
		await flushEffects();

		const handle = handleOf(wrapper);
		expect(handle.playing()).toBe(true);

		handle.pause();
		await flushEffects();
		expect(handle.playing()).toBe(false);

		handle.play();
		await flushEffects();
		expect(handle.playing()).toBe(true);
	});

	it('autoplay 关闭时 playing 为 false', async () => {
		vi.useFakeTimers();
		const wrapper = mountVegas({ autoplay: false });
		await flushEffects();

		expect(handleOf(wrapper).playing()).toBe(false);
	});

	it('toggle 在播放与暂停之间切换', async () => {
		vi.useFakeTimers();
		const onPlay = vi.fn();
		const onPause = vi.fn();
		const wrapper = mountVegas({ autoplay: true, onPlay, onPause });
		await flushEffects();

		const handle = handleOf(wrapper);
		handle.toggle();
		await flushEffects();
		expect(handle.playing()).toBe(false);
		expect(onPause).toHaveBeenCalledTimes(1);

		handle.toggle();
		await flushEffects();
		expect(handle.playing()).toBe(true);
		expect(onPlay).toHaveBeenCalledTimes(2); // 首次进入播放 + toggle 恢复
	});
});
