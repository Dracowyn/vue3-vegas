import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Vegas from '../src/Vegas.vue';
import type { SlideProps, VegasHandle } from '../src/types';
import { resolveSlideVideo } from '../src/utils/videoSource';
import { advanceTimers, capturePreloadedVideos, flushEffects } from './helpers';

const mountVegas = (slides: SlideProps[], extraProps: Record<string, unknown> = {}) =>
	mount(Vegas, {
		props: {
			slides,
			autoplay: false,
			firstTransitionDuration: 0,
			...extraProps,
		},
	});

const handleOf = (wrapper: ReturnType<typeof mount>) => wrapper.vm as unknown as VegasHandle;

describe('resolveSlideVideo', () => {
	it('数组简写补齐 muted / loop 的默认值', () => {
		expect(resolveSlideVideo(['/a.mp4', '/a.webm'])).toEqual({
			src: ['/a.mp4', '/a.webm'],
			muted: true,
			loop: true,
		});
	});

	it('完整形式缺省时同样默认静音且循环', () => {
		expect(resolveSlideVideo({ src: ['/a.mp4'] })).toEqual({
			src: ['/a.mp4'],
			muted: true,
			loop: true,
		});
	});

	it('完整形式的显式配置原样保留', () => {
		expect(resolveSlideVideo({ src: ['/a.mp4'], muted: false, loop: false })).toEqual({
			src: ['/a.mp4'],
			muted: false,
			loop: false,
		});
	});

	it('没有配置视频时返回 null', () => {
		expect(resolveSlideVideo(undefined)).toBeNull();
		expect(resolveSlideVideo(null)).toBeNull();
	});

	// 一个 <source> 都没有的 <video> 既不会触发 ended 也不会触发 source error，
	// 是个放不出来也走不掉的死状态——当成「不是视频幻灯片」处理
	it('源列表为空时返回 null，不当作视频幻灯片', () => {
		expect(resolveSlideVideo([])).toBeNull();
		expect(resolveSlideVideo({ src: [] })).toBeNull();
	});
});

describe('空源视频幻灯片', () => {
	afterEach(() => {
		if (vi.isFakeTimers()) {
			vi.runOnlyPendingTimers();
			vi.useRealTimers();
		}
	});

	it('退回图片渲染，而不是渲染一个放不出来的空 <video>', async () => {
		const wrapper = mountVegas([{ src: '/a.jpg', video: [] }]);
		await flushEffects();

		expect(wrapper.find('video').exists()).toBe(false);
		expect(wrapper.find('img').attributes('src')).toBe('/a.jpg');
	});

	it("不按 delay: 'video' 的 videoMaxDelay 兜底，照常用 delay 切走", async () => {
		vi.useFakeTimers();
		const wrapper = mountVegas(
			[{ src: '/a.jpg', delay: 'video', video: [] }, { src: '/b.jpg' }],
			{ autoplay: true, delay: 3000, videoMaxDelay: 300000, transitionDuration: 0 }
		);
		await flushEffects();

		expect(handleOf(wrapper).current()).toBe(0);

		await advanceTimers(3000);
		expect(handleOf(wrapper).current()).toBe(1);
	});

	it('不占用 preloadVideo 的预加载额度', async () => {
		const capture = capturePreloadedVideos();

		mountVegas([{ src: '/a.jpg', video: [] }], { preloadVideo: true });
		await flushEffects();

		expect(capture.preloaded()).toEqual([]);

		capture.restore();
	});

	it('debug 打开时告警，提示这张按图片处理了', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

		mountVegas([{ src: '/a.jpg', video: [] }], { debug: true });
		await flushEffects();

		expect(warn).toHaveBeenCalledWith(expect.stringContaining('/a.jpg'));
		warn.mockRestore();
	});
});
