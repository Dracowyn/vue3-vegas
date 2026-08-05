import { mount } from '@vue/test-utils';
import { describe, expect, it, vi, afterEach } from 'vitest';
import Vegas from '../src/Vegas.vue';
import type { SlideProps, VegasHandle } from '../src/types';
import { flushEffects } from './helpers';

const slides: SlideProps[] = [
	{ src: '/vis-a.jpg' },
	{ src: '/vis-b.jpg' },
];

const handleOf = (wrapper: ReturnType<typeof mount>) =>
	wrapper.vm as unknown as VegasHandle;

// 在 document 实例上遮蔽原型的 hidden getter，模拟标签页隐藏/可见
const setDocumentHidden = (hidden: boolean) => {
	Object.defineProperty(document, 'hidden', {
		configurable: true,
		get: () => hidden,
	});
	document.dispatchEvent(new Event('visibilitychange'));
};

describe('页面可见性变化', () => {
	afterEach(() => {
		Reflect.deleteProperty(document, 'hidden');
		if (vi.isFakeTimers()) {
			vi.runOnlyPendingTimers();
			vi.useRealTimers();
		}
	});

	it('播放中隐藏则暂停，重新可见后恢复播放', async () => {
		vi.useFakeTimers();
		const wrapper = mount(Vegas, {
			props: { slides, autoplay: true, firstTransitionDuration: 0 },
		});
		await flushEffects();

		const handle = handleOf(wrapper);
		expect(handle.playing()).toBe(true);

		setDocumentHidden(true);
		await flushEffects();
		expect(handle.playing()).toBe(false);

		setDocumentHidden(false);
		await flushEffects();
		expect(handle.playing()).toBe(true);
	});

	it('首帧阶段隐藏再可见，自动播放仍会开始（不能永久暂停）', async () => {
		vi.useFakeTimers();
		const wrapper = mount(Vegas, {
			props: {
				slides,
				autoplay: true,
				delay: 5000,
				// 首帧持续 1000ms，隐藏发生在这个窗口内
				firstTransitionDuration: 1000,
			},
		});
		await flushEffects();

		const handle = handleOf(wrapper);
		// 还在首帧，尚未进入播放
		expect(handle.playing()).toBe(false);

		setDocumentHidden(true);
		await flushEffects();

		setDocumentHidden(false);
		await flushEffects();

		// autoplay 本来就要开始播放，重新可见后必须恢复这个意图
		expect(handle.playing()).toBe(true);
	});

	it('手动暂停后隐藏再可见，保持暂停不被误恢复', async () => {
		vi.useFakeTimers();
		const wrapper = mount(Vegas, {
			props: { slides, autoplay: true, firstTransitionDuration: 0 },
		});
		await flushEffects();

		const handle = handleOf(wrapper);
		handle.pause();
		await flushEffects();
		expect(handle.playing()).toBe(false);

		setDocumentHidden(true);
		await flushEffects();
		setDocumentHidden(false);
		await flushEffects();

		expect(handle.playing()).toBe(false);
	});
});
