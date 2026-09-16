import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Vegas from '../src/Vegas.vue';
import type { SlideProps, VegasHandle } from '../src/types';
import { fadeInVideoSound, fadeOutSlideVideo } from '../src/utils/videoSound';
import { advanceTimers, flushEffects } from './helpers';

const pauseMock = () => HTMLMediaElement.prototype.pause as unknown as ReturnType<typeof vi.fn>;

const createVideo = () => {
	const video = document.createElement('video');
	document.body.append(video);
	return video;
};

/** 把 video 包进一层幻灯片根元素，模拟 TransitionGroup 离场钩子拿到的结构 */
const createSlideWithVideo = () => {
	const slideEl = document.createElement('div');
	const video = document.createElement('video');
	slideEl.append(video);
	document.body.append(slideEl);
	return { slideEl, video };
};

// 离场钩子要真的跑起来才能观察到淡出与暂停，因此本文件关掉 TransitionGroup 的 stub。
// 保持这个 opt-out 只作用于本文件（见 tests/setup.ts 的说明）
const mountVegas = (slides: SlideProps[], extraProps: Record<string, unknown> = {}) =>
	mount(Vegas, {
		props: {
			slides,
			autoplay: false,
			transitionDuration: 1000,
			firstTransitionDuration: 0,
			...extraProps,
		},
		global: {
			stubs: {
				transition: false,
				'transition-group': false,
			},
		},
	});

const handleOf = (wrapper: ReturnType<typeof mount>) => wrapper.vm as unknown as VegasHandle;
const videosOf = (wrapper: ReturnType<typeof mount>) =>
	Array.from(wrapper.element.querySelectorAll('video')) as HTMLVideoElement[];

const loudVideoSlide = (name: string): SlideProps => ({
	src: `/${name}.jpg`,
	video: { src: [`/${name}.mp4`], muted: false },
});

describe('视频音量淡变工具', () => {
	afterEach(() => {
		if (vi.isFakeTimers()) {
			vi.runOnlyPendingTimers();
			vi.useRealTimers();
		}
	});

	it('fadeInVideoSound 把音量从 0 线性推到满，正好用掉给定时长', async () => {
		vi.useFakeTimers();
		const video = createVideo();

		fadeInVideoSound(video, 1000);
		expect(video.volume).toBe(0);

		await advanceTimers(500);
		expect(video.volume).toBeCloseTo(0.5, 5);

		await advanceTimers(500);
		expect(video.volume).toBe(1);
	});

	it('fadeInVideoSound 时长为 0 时直接给满音量，不留定时器', async () => {
		vi.useFakeTimers();
		const video = createVideo();

		fadeInVideoSound(video, 0);

		expect(video.volume).toBe(1);
		expect(vi.getTimerCount()).toBe(0);
	});

	it('fadeOutSlideVideo 把音量淡出到 0 并在结束时暂停', async () => {
		vi.useFakeTimers();
		const { slideEl, video } = createSlideWithVideo();

		fadeOutSlideVideo(slideEl, 1000);

		await advanceTimers(500);
		expect(video.volume).toBeCloseTo(0.5, 5);
		expect(pauseMock()).not.toHaveBeenCalled();

		await advanceTimers(500);
		expect(video.volume).toBe(0);
		expect(pauseMock()).toHaveBeenCalled();
	});

	it('fadeOutSlideVideo 时长为 0 时立即静音并暂停', () => {
		vi.useFakeTimers();
		const { slideEl, video } = createSlideWithVideo();

		fadeOutSlideVideo(slideEl, 0);

		expect(video.volume).toBe(0);
		expect(pauseMock()).toHaveBeenCalled();
		expect(vi.getTimerCount()).toBe(0);
	});

	it('fadeOutSlideVideo 遇到没有视频的幻灯片不报错', () => {
		const slideEl = document.createElement('div');
		document.body.append(slideEl);

		expect(() => fadeOutSlideVideo(slideEl, 1000)).not.toThrow();
	});

	it('返回的取消函数能中断未跑完的淡变', async () => {
		vi.useFakeTimers();
		const video = createVideo();

		const cancel = fadeInVideoSound(video, 1000);
		await advanceTimers(300);
		const volumeAtCancel = video.volume;

		cancel();
		await advanceTimers(700);

		expect(video.volume).toBe(volumeAtCancel);
		expect(video.volume).toBeLessThan(1);
	});
});

describe('视频声音淡入淡出（对齐原版 Vegas.js）', () => {
	afterEach(() => {
		if (vi.isFakeTimers()) {
			vi.runOnlyPendingTimers();
			vi.useRealTimers();
		}
	});

	it('muted: false 的视频进入时音量随过渡淡入', async () => {
		vi.useFakeTimers();
		const wrapper = mountVegas([loudVideoSlide('a')], { firstTransitionDuration: 1000 });
		await flushEffects();

		const video = videosOf(wrapper)[0];
		expect(video.volume).toBe(0);

		await advanceTimers(500);
		expect(video.volume).toBeCloseTo(0.5, 5);

		await advanceTimers(500);
		expect(video.volume).toBe(1);
	});

	it('静音视频不碰音量', async () => {
		vi.useFakeTimers();
		const wrapper = mountVegas([{ src: '/a.jpg', video: { src: ['/a.mp4'] } }], {
			firstTransitionDuration: 1000,
		});
		await flushEffects();

		const video = videosOf(wrapper)[0];
		expect(video.muted).toBe(true);
		expect(video.volume).toBe(1);

		await advanceTimers(1000);
		expect(video.volume).toBe(1);
	});

	it('离场视频音量淡出并在过渡结束时暂停，不与新视频的声音硬切重叠', async () => {
		vi.useFakeTimers();
		const wrapper = mountVegas([loudVideoSlide('a'), loudVideoSlide('b')], {
			autoplay: true,
			delay: 100000,
		});
		await flushEffects();

		// 先让首帧视频自己的淡入跑满，再观察它离场时的淡出
		const leaving = videosOf(wrapper)[0];
		await advanceTimers(1000);
		expect(leaving.volume).toBe(1);
		pauseMock().mockClear();

		handleOf(wrapper).next();
		await flushEffects();

		await advanceTimers(500);
		expect(leaving.volume).toBeCloseTo(0.5, 5);
		expect(pauseMock()).not.toHaveBeenCalled();

		await advanceTimers(500);
		expect(leaving.volume).toBe(0);
		expect(pauseMock()).toHaveBeenCalled();
	});

	it('进入的视频用本次过渡的时长淡入（跟随 slide.transitionDuration）', async () => {
		vi.useFakeTimers();
		const wrapper = mountVegas(
			[
				{ src: '/a.jpg' },
				{ ...loudVideoSlide('b'), transitionDuration: 2000 },
			],
			{ autoplay: true, delay: 100000 }
		);
		await flushEffects();

		handleOf(wrapper).next();
		await flushEffects();

		const entering = videosOf(wrapper).at(-1) as HTMLVideoElement;
		expect(entering.volume).toBe(0);

		await advanceTimers(1000);
		expect(entering.volume).toBeCloseTo(0.5, 5);

		await advanceTimers(1000);
		expect(entering.volume).toBe(1);
	});
});

describe('淡变链互斥', () => {
	afterEach(() => {
		if (vi.isFakeTimers()) {
			vi.runOnlyPendingTimers();
			vi.useRealTimers();
		}
	});

	// 首帧进场不经过 startTransition，`isTransitioning` 锁此刻并未持有，
	// 所以淡入还没跑完就可以被 next() 切走——两条淡变链会同时写同一个 volume
	it('首帧淡入未跑完就被切走时，离场音量单调下降，不被仍在跑的淡入链推回去', async () => {
		vi.useFakeTimers();
		const wrapper = mountVegas([loudVideoSlide('a'), loudVideoSlide('b')], {
			autoplay: true,
			delay: 100000,
			transitionDuration: 1000,
		});
		await flushEffects();

		const leaving = videosOf(wrapper)[0];

		await advanceTimers(250);
		expect(leaving.volume).toBeCloseTo(0.2, 5);

		handleOf(wrapper).next();
		await flushEffects();

		let previous = leaving.volume;
		for (let elapsed = 0; elapsed < 1400; elapsed += 50) {
			await advanceTimers(50);
			expect(leaving.volume).toBeLessThanOrEqual(previous);
			previous = leaving.volume;
		}

		expect(leaving.volume).toBe(0);
		expect(pauseMock()).toHaveBeenCalled();
	});

	it('暂停状态下切入的视频压在 0，恢复播放时才开始淡入', async () => {
		vi.useFakeTimers();
		const wrapper = mountVegas([{ src: '/a.jpg' }, loudVideoSlide('b')], {
			autoplay: false,
			transitionDuration: 1000,
			firstTransitionDuration: 0,
		});
		await flushEffects();

		handleOf(wrapper).goTo(1);
		await flushEffects();

		const entering = videosOf(wrapper).at(-1) as HTMLVideoElement;
		expect(entering.volume).toBe(0);

		// 暂停期间不该把音量悄悄推满，否则恢复播放时是满音量硬切
		await advanceTimers(2000);
		expect(entering.volume).toBe(0);

		handleOf(wrapper).play();
		await flushEffects();

		await advanceTimers(500);
		expect(entering.volume).toBeCloseTo(0.5, 5);

		await advanceTimers(500);
		expect(entering.volume).toBe(1);
	});
});
