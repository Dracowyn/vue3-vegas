import { mount } from '@vue/test-utils';
import { describe, expect, it, vi, afterEach } from 'vitest';
import Vegas from '../src/Vegas.vue';
import type { SlideProps } from '../src/types';
import { flushEffects } from './helpers';

const videoSlide: SlideProps = {
	src: '/poster.jpg',
	video: { src: ['/clip.mp4', '/clip.webm'] },
};

const mountVideo = (slide: SlideProps) => mount(Vegas, {
	props: {
		slides: [slide],
		autoplay: false,
		firstTransitionDuration: 0,
	},
});

describe('视频幻灯片默认行为', () => {
	afterEach(() => {
		if (vi.isFakeTimers()) {
			vi.runOnlyPendingTimers();
			vi.useRealTimers();
		}
	});

	it('未配置时默认静音并循环（与原版 Vegas.js 一致）', async () => {
		const wrapper = mountVideo(videoSlide);
		await flushEffects();

		const video = wrapper.find('video');
		expect(video.exists()).toBe(true);
		expect((video.element as HTMLVideoElement).muted).toBe(true);
		expect((video.element as HTMLVideoElement).loop).toBe(true);
	});

	it('显式配置可以覆盖默认值', async () => {
		const wrapper = mountVideo({
			src: '/poster.jpg',
			video: { src: ['/clip.mp4'], muted: false, loop: false },
		});
		await flushEffects();

		const video = wrapper.find('video');
		expect((video.element as HTMLVideoElement).muted).toBe(false);
		expect((video.element as HTMLVideoElement).loop).toBe(false);
	});

	it('设置 playsinline 防止 iOS 全屏接管，并把 src 用作封面 poster', async () => {
		const wrapper = mountVideo(videoSlide);
		await flushEffects();

		const video = wrapper.find('video');
		expect(video.attributes('playsinline')).toBeDefined();
		expect(video.attributes('poster')).toBe('/poster.jpg');
	});
});
