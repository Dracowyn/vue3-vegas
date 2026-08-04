import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Vegas from '../src/Vegas.vue';
import { advanceTimers, flushEffects } from './helpers';

// @vue/test-utils 默认把 <TransitionGroup> 换成 stub，JS 进入/离开钩子就不会执行。
// 这里只对本文件的用例关掉 stub，全局默认保持不变，避免影响其它测试。
const mountVegas = (props: Record<string, unknown>) =>
	mount(Vegas, {
		props,
		global: {
			stubs: {
				transition: false,
				'transition-group': false,
			},
		},
	});

const slideElements = (wrapper: ReturnType<typeof mount>) =>
	Array.from(wrapper.element.querySelectorAll('[data-slide-index]')) as HTMLElement[];

const slideElement = (wrapper: ReturnType<typeof mount>, index: number) => {
	const el = slideElements(wrapper).find(node => node.dataset.slideIndex === String(index));
	expect(el).toBeTruthy();
	return el as HTMLElement;
};

const rootChildren = (wrapper: ReturnType<typeof mount>) =>
	Array.from(wrapper.element.children) as HTMLElement[];

const findOverlayElement = (wrapper: ReturnType<typeof mount>) =>
	rootChildren(wrapper).find(el => !el.hasAttribute('data-slide-index') && el.style.background !== '');

const findTimerElement = (wrapper: ReturnType<typeof mount>) =>
	rootChildren(wrapper).find(el => el.style.height === '3px');

const zIndexOf = (el: HTMLElement) => Number(el.style.zIndex || '0');

describe('TransitionGroup enter/leave hooks', () => {
	afterEach(() => {
		if (vi.isFakeTimers()) {
			vi.runOnlyPendingTimers();
			vi.useRealTimers();
		}
	});

	it('drives the incoming slide from the preset "from" state to the "to" state', async () => {
		vi.useFakeTimers();

		const wrapper = mountVegas({
			slides: [{ src: '/a.jpg' }],
			autoplay: false,
			transition: 'zoomIn',
			transitionDuration: 1000,
			firstTransitionDuration: 0,
		});

		await flushEffects();

		const entering = slideElement(wrapper, 0);
		// from 之后立即被 to 覆盖（中间隔一次强制回流），因此这里读到的是 to 的值
		expect(entering.style.transform).toBe('scale(1)');
		expect(entering.style.opacity).toBe('1');
		// transition 简写只覆盖 to 里出现的属性，不应波及 z-index
		expect(entering.style.transition).toContain('transform 1000ms');
		expect(entering.style.transition).toContain('opacity 1000ms');
		expect(entering.style.transition).not.toContain('z-index');
	});

	it('leaves the outgoing slide untouched for an "X" preset', async () => {
		vi.useFakeTimers();

		const wrapper = mountVegas({
			slides: [{ src: '/a.jpg' }, { src: '/b.jpg' }],
			autoplay: false,
			transition: 'fade',
			transitionDuration: 1000,
			firstTransitionDuration: 0,
		});

		await flushEffects();
		expect(slideElement(wrapper, 0).style.opacity).toBe('1');

		(wrapper.vm as unknown as { next: () => void }).next();
		await flushEffects();

		// 无 out 的预设：旧图保持原样，只等待被移除
		const leaving = slideElement(wrapper, 0);
		expect(leaving.style.opacity).toBe('1');
		expect(slideElement(wrapper, 1).style.opacity).toBe('1');
	});

	it('animates the outgoing slide with the preset "out" state for an "X2" preset', async () => {
		vi.useFakeTimers();

		const wrapper = mountVegas({
			slides: [{ src: '/a.jpg' }, { src: '/b.jpg' }],
			autoplay: false,
			transition: 'fade2',
			transitionDuration: 1000,
			firstTransitionDuration: 0,
		});

		await flushEffects();

		(wrapper.vm as unknown as { next: () => void }).next();
		await flushEffects();

		const leaving = slideElement(wrapper, 0);
		expect(leaving.style.opacity).toBe('0');
		expect(leaving.style.transition).toContain('opacity 1000ms');
	});

	it('paints the entering slide above the leaving one', async () => {
		vi.useFakeTimers();

		const wrapper = mountVegas({
			slides: [{ src: '/a.jpg' }, { src: '/b.jpg' }],
			autoplay: false,
			transition: 'fade2',
			transitionDuration: 1000,
			firstTransitionDuration: 0,
		});

		await flushEffects();

		(wrapper.vm as unknown as { next: () => void }).next();
		await flushEffects();

		expect(zIndexOf(slideElement(wrapper, 1))).toBeGreaterThan(zIndexOf(slideElement(wrapper, 0)));
	});

	it('uses the incoming slide transition name for the leave hook', async () => {
		vi.useFakeTimers();

		const wrapper = mountVegas({
			slides: [
				{ src: '/a.jpg', transition: 'fade2' },
				{ src: '/b.jpg', transition: 'slideLeft2' },
			],
			autoplay: false,
			transitionDuration: 1000,
			firstTransitionDuration: 0,
		});

		await flushEffects();
		// 离场元素上残留的 data 属性还是上一张的过渡名
		expect(slideElement(wrapper, 0).dataset.transitionName).toBe('fade2');

		(wrapper.vm as unknown as { next: () => void }).next();
		await flushEffects();

		// 离场必须用「目标幻灯片」的过渡（slideLeft2），而不是自己身上的 fade2
		const leaving = slideElement(wrapper, 0);
		expect(leaving.style.transform).toBe('translateX(-100%)');
		expect(leaving.style.opacity).not.toBe('0');
	});

	it('keeps the settled slide below the overlay and the timer', async () => {
		vi.useFakeTimers();

		const wrapper = mountVegas({
			slides: [{ src: '/a.jpg' }, { src: '/b.jpg' }],
			autoplay: false,
			overlay: true,
			overlayColor: 'rgba(0,0,0,0.5)',
			timer: true,
			transition: 'fade',
			transitionDuration: 1000,
			firstTransitionDuration: 0,
		});

		await flushEffects();
		// 进入动画结束，幻灯片就位
		await advanceTimers(1000);

		const settled = slideElement(wrapper, 0);
		const overlay = findOverlayElement(wrapper);
		const timer = findTimerElement(wrapper);

		expect(overlay).toBeTruthy();
		expect(timer).toBeTruthy();
		// 就位后的幻灯片仍带着 z-index，遮罩与进度条必须压在它之上
		expect(zIndexOf(settled)).toBeLessThan(zIndexOf(overlay as HTMLElement));
		expect(zIndexOf(settled)).toBeLessThan(zIndexOf(timer as HTMLElement));
	});
});
