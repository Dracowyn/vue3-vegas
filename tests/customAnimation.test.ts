import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import Vegas from '../src/Vegas.vue';
import { flushEffects } from './helpers';

// 原版语义：自定义 Ken Burns 动画靠 CSS 类生效——组件只负责挂类名与设置
// animationDuration，keyframes 由使用者的 CSS 提供（区别于内置动画的行内 animation 简写）。
describe('custom animations via animationRegister (CSS class mode)', () => {
	it('adds the "vegas-animation-{name}" class and sets animationDuration, without an inline built-in animation', async () => {
		const wrapper = mount(Vegas, {
			props: {
				slides: [{ src: '/a.jpg' }],
				autoplay: false,
				animation: 'myZoom',
				animationRegister: ['myZoom'],
				animationDuration: 4000,
				firstTransitionDuration: 0,
			},
		});

		await flushEffects();

		const img = wrapper.find('img[src="/a.jpg"]');
		expect(img.exists()).toBe(true);
		const el = img.element as HTMLImageElement;

		expect(el.classList.contains('vegas-animation-myZoom')).toBe(true);
		expect(el.style.animationDuration).toBe('4000ms');
		// 内置 Ken Burns 靠行内 animation 简写生效,自定义动画没有对应 keyframes,不应该写这个属性
		expect(el.style.animation).toBe('');
	});

	it('still uses the inline animation shorthand for a built-in Ken Burns name', async () => {
		const wrapper = mount(Vegas, {
			props: {
				slides: [{ src: '/b.jpg' }],
				autoplay: false,
				animation: 'kenburnsUp',
				animationDuration: 4000,
				firstTransitionDuration: 0,
			},
		});

		await flushEffects();

		const img = wrapper.find('img[src="/b.jpg"]');
		expect(img.exists()).toBe(true);
		const el = img.element as HTMLImageElement;

		expect(el.style.animation).toContain('vue3-vegas-kenburnsUp');
		expect(el.classList.contains('vegas-animation-kenburnsUp')).toBe(false);
	});
});
