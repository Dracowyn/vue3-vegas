import { mount } from '@vue/test-utils';
import { describe, expect, it, vi, afterEach } from 'vitest';
import Vegas from '../src/Vegas.vue';
import type { SlideProps, VegasHandle } from '../src/types';
import { capturePreloadedVideos, flushEffects } from './helpers';

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

describe('video 数组简写（对齐原版 Vegas.js）', () => {
	afterEach(() => {
		if (vi.isFakeTimers()) {
			vi.runOnlyPendingTimers();
			vi.useRealTimers();
		}
	});

	it('video 直接传数组等价于 { src: [...] }，muted / loop 取默认值', async () => {
		const wrapper = mountVideo({
			src: '/poster.jpg',
			video: ['/clip.mp4', '/clip.webm'],
		});
		await flushEffects();

		const video = wrapper.find('video');
		expect(video.exists()).toBe(true);
		expect(wrapper.findAll('source').map(node => node.attributes('src')))
			.toEqual(['/clip.mp4', '/clip.webm']);
		expect((video.element as HTMLVideoElement).muted).toBe(true);
		expect((video.element as HTMLVideoElement).loop).toBe(true);
	});

	it("数组简写配合 delay: 'video' 时同样强制关掉 loop", async () => {
		const wrapper = mount(Vegas, {
			props: {
				slides: [
					{ src: '/poster.jpg', delay: 'video', video: ['/clip.mp4'] },
					{ src: '/image.jpg' },
				] as SlideProps[],
				autoplay: false,
				firstTransitionDuration: 0,
			},
		});
		await flushEffects();

		expect((wrapper.find('video').element as HTMLVideoElement).loop).toBe(false);
	});

	it('数组简写也参与 preloadVideo 的预加载', async () => {
		const capture = capturePreloadedVideos();

		mount(Vegas, {
			props: {
				slides: [{ src: '/poster.jpg', video: ['/clip.mp4', '/clip.webm'] }] as SlideProps[],
				autoplay: false,
				preloadVideo: true,
				firstTransitionDuration: 0,
			},
		});
		await flushEffects();

		expect(capture.preloaded()).toEqual([['/clip.mp4', '/clip.webm']]);

		capture.restore();
	});
});

const handleOf = (wrapper: ReturnType<typeof mount>) => wrapper.vm as unknown as VegasHandle;

// video.loop:false 本身就该在播完时自动切走，不依赖 slide.delay: 'video'（那是「播完再切」
// 的另一条独立开关，见 useVideoAdvance 里 advanceOnEnded / videoLoop 的组合判断）。
// 这一组在重构前也存在，但一直没有端到端用例覆盖，顺手补上。
describe('video.loop:false 时视频播完自动切走（不依赖 delay: "video"）', () => {
	afterEach(() => {
		if (vi.isFakeTimers()) {
			vi.runOnlyPendingTimers();
			vi.useRealTimers();
		}
	});

	const mountLoopSlide = (loop: boolean) => {
		vi.useFakeTimers();
		return mount(Vegas, {
			props: {
				slides: [
					{ src: '/a.jpg', video: { src: ['/clip.mp4'], loop } },
					{ src: '/b.jpg' },
				] as SlideProps[],
				autoplay: true,
				delay: 100000,
				firstTransitionDuration: 0,
			},
		});
	};

	it('loop:false 的视频播完后立即切到下一张', async () => {
		const wrapper = mountLoopSlide(false);
		await flushEffects();

		wrapper.find('video').element.dispatchEvent(new Event('ended'));
		await flushEffects();

		expect(handleOf(wrapper).current()).toBe(1);
	});

	it('默认 loop 的视频播完不会自动切走', async () => {
		const wrapper = mountLoopSlide(true);
		await flushEffects();

		wrapper.find('video').element.dispatchEvent(new Event('ended'));
		await flushEffects();

		expect(handleOf(wrapper).current()).toBe(0);
	});

	it('loop:false 但非「播完再切」的幻灯片，视频放不出来不会自动切走（video-failed 只认 advanceOnEnded）', async () => {
		const wrapper = mountLoopSlide(false);
		await flushEffects();

		wrapper.find('source').element.dispatchEvent(new Event('error'));
		await flushEffects();

		expect(handleOf(wrapper).current()).toBe(0);
	});
});
