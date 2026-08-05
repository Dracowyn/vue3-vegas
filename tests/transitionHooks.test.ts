import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Vegas from '../src/Vegas.vue';
import { VEGAS_LAYERS } from '../src/constants/layers';
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

	it('applies the incoming slide transition duration to the leave animation too', async () => {
		vi.useFakeTimers();

		const wrapper = mountVegas({
			slides: [
				{ src: '/a.jpg' },
				{ src: '/b.jpg', transitionDuration: 3000 },
			],
			autoplay: false,
			transition: 'fade2',
			transitionDuration: 1000,
			firstTransitionDuration: 0,
		});

		await flushEffects();

		(wrapper.vm as unknown as { next: () => void }).next();
		await flushEffects();

		// 原版语义：进入与离开共用「目标幻灯片」解析出的时长（3000ms），
		// 不能一边 3 秒淡入、一边 1 秒就消失
		const leaving = slideElement(wrapper, 0);
		expect(leaving.style.transition).toContain('opacity 3000ms');
		expect(leaving.style.transition).not.toContain('opacity 1000ms');
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

// 原版语义：自定义过渡靠 CSS 类生效，组件本身不知道效果长什么样——
// 只负责按约定的时机加/换类名、设置层叠与 transition 简写，样式由使用者的 CSS 提供。
describe('custom transitions via transitionRegister (CSS class mode)', () => {
	afterEach(() => {
		if (vi.isFakeTimers()) {
			vi.runOnlyPendingTimers();
			vi.useRealTimers();
		}
	});

	it('adds the base and "-in" classes, sets the entering z-index and transition duration', async () => {
		vi.useFakeTimers();

		const wrapper = mountVegas({
			slides: [{ src: '/a.jpg' }],
			autoplay: false,
			transition: 'myFade',
			transitionRegister: ['myFade'],
			transitionDuration: 1000,
			firstTransitionDuration: 0,
		});

		await flushEffects();

		const entering = slideElement(wrapper, 0);
		expect(entering.classList.contains('vegas-transition-myFade')).toBe(true);
		expect(entering.classList.contains('vegas-transition-myFade-in')).toBe(true);
		expect(entering.style.transition).toContain('all 1000ms');
		expect(zIndexOf(entering)).toBe(VEGAS_LAYERS.slideEntering);
	});

	it('adds the base, "-in" and "-out" classes and sets the leaving z-index on leave', async () => {
		vi.useFakeTimers();

		const wrapper = mountVegas({
			slides: [{ src: '/a.jpg' }, { src: '/b.jpg' }],
			autoplay: false,
			transition: 'myFade',
			transitionRegister: ['myFade'],
			transitionDuration: 1000,
			firstTransitionDuration: 0,
		});

		await flushEffects();

		(wrapper.vm as unknown as { next: () => void }).next();
		await flushEffects();

		// 原版语义：离场元素先补上本次过渡名的 base + -in（就位态），再叠加 -out
		const leaving = slideElement(wrapper, 0);
		expect(leaving.classList.contains('vegas-transition-myFade')).toBe(true);
		expect(leaving.classList.contains('vegas-transition-myFade-in')).toBe(true);
		expect(leaving.classList.contains('vegas-transition-myFade-out')).toBe(true);
		expect(leaving.style.transition).toContain('all 1000ms');
		expect(zIndexOf(leaving)).toBe(VEGAS_LAYERS.slideLeaving);
	});

	it('clears inline styles left by a built-in preset before switching to a custom leave transition', async () => {
		vi.useFakeTimers();

		const wrapper = mountVegas({
			slides: [
				{ src: '/a.jpg' },
				{ src: '/b.jpg', transition: 'myFade' },
			],
			autoplay: false,
			transition: 'fade',
			transitionRegister: ['myFade'],
			transitionDuration: 1000,
			firstTransitionDuration: 0,
		});

		await flushEffects();

		// 上一张用内置 fade 进场，留下了行内 opacity / transition 简写
		const entering = slideElement(wrapper, 0);
		expect(entering.style.opacity).toBe('1');
		expect(entering.style.transition).toContain('opacity 1000ms');

		(wrapper.vm as unknown as { next: () => void }).next();
		await flushEffects();

		// 这一张离场改走自定义过渡（目标幻灯片的 myFade）：内置预设留下的行内样式必须被清掉，
		// 否则行内样式的优先级永远压过用户 CSS 里的 .vegas-transition-myFade-out
		const leaving = slideElement(wrapper, 0);
		expect(leaving.style.opacity).toBe('');
		expect(leaving.style.transform).toBe('');
		expect(leaving.style.filter).toBe('');
		expect(leaving.style.transition).toContain('all 1000ms');
		expect(leaving.style.transition).not.toContain('opacity 1000ms');
		expect(leaving.classList.contains('vegas-transition-myFade')).toBe(true);
		expect(leaving.classList.contains('vegas-transition-myFade-in')).toBe(true);
		expect(leaving.classList.contains('vegas-transition-myFade-out')).toBe(true);
	});

	it('removes the previous custom transition classes when the leave transition changes to a different custom name', async () => {
		vi.useFakeTimers();

		const wrapper = mountVegas({
			slides: [
				{ src: '/a.jpg', transition: 'myA' },
				{ src: '/b.jpg', transition: 'myB' },
			],
			autoplay: false,
			transitionRegister: ['myA', 'myB'],
			transitionDuration: 1000,
			firstTransitionDuration: 0,
		});

		await flushEffects();

		const entering = slideElement(wrapper, 0);
		expect(entering.classList.contains('vegas-transition-myA')).toBe(true);
		expect(entering.classList.contains('vegas-transition-myA-in')).toBe(true);

		(wrapper.vm as unknown as { next: () => void }).next();
		await flushEffects();

		// A 进场时挂的类不能残留下来跟 B 的 -out 同特异性打架，必须先清掉再换成 B 的
		const leaving = slideElement(wrapper, 0);
		expect(leaving.classList.contains('vegas-transition-myA')).toBe(false);
		expect(leaving.classList.contains('vegas-transition-myA-in')).toBe(false);
		expect(leaving.classList.contains('vegas-transition-myB')).toBe(true);
		expect(leaving.classList.contains('vegas-transition-myB-in')).toBe(true);
		expect(leaving.classList.contains('vegas-transition-myB-out')).toBe(true);
	});
});
