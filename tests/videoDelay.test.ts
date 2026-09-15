import { mount } from '@vue/test-utils';
import { describe, expect, it, vi, afterEach } from 'vitest';
import Vegas from '../src/Vegas.vue';
import VegasSlideRenderer from '../src/components/VegasSlideRenderer.vue';
import type { SlideProps, VegasHandle } from '../src/types';
import { advanceTimers, flushEffects } from './helpers';

const untilEnded: SlideProps = {
	src: '/poster.jpg',
	delay: 'video',
	video: { src: ['/clip.mp4', '/clip.webm'] },
};
const image: SlideProps = { src: '/image.jpg' };

const mountVegas = (slides: SlideProps[], extraProps: Record<string, unknown> = {}) => mount(Vegas, {
	props: {
		slides,
		autoplay: true,
		delay: 5000,
		transitionDuration: 1000,
		firstTransitionDuration: 0,
		...extraProps,
	},
});

const handleOf = (wrapper: ReturnType<typeof mount>) => wrapper.vm as unknown as VegasHandle;
const videoOf = (wrapper: ReturnType<typeof mount>) => wrapper.find('video').element as HTMLVideoElement;

describe("视频幻灯片 delay: 'video'", () => {
	afterEach(() => {
		if (vi.isFakeTimers()) {
			vi.runOnlyPendingTimers();
			vi.useRealTimers();
		}
	});

	it('不按全局 delay 切走，视频播完才切到下一张', async () => {
		vi.useFakeTimers();
		const wrapper = mountVegas([untilEnded, image]);
		await flushEffects();

		await advanceTimers(20000);
		expect(handleOf(wrapper).current()).toBe(0);

		videoOf(wrapper).dispatchEvent(new Event('ended'));
		await flushEffects();
		expect(handleOf(wrapper).current()).toBe(1);
	});

	it('忽略 video.loop，视频只播一遍（否则 ended 永远不会触发）', async () => {
		const wrapper = mountVegas([{ ...untilEnded, video: { src: ['/clip.mp4'], loop: true } }, image], {
			autoplay: false,
		});
		await flushEffects();

		expect(videoOf(wrapper).loop).toBe(false);
	});

	it('视频卡住时到 videoMaxDelay 兜底切走', async () => {
		vi.useFakeTimers();
		const wrapper = mountVegas([untilEnded, image], { videoMaxDelay: 60000 });
		await flushEffects();

		await advanceTimers(59999);
		expect(handleOf(wrapper).current()).toBe(0);

		await advanceTimers(1);
		expect(handleOf(wrapper).current()).toBe(1);
	});

	it('videoMaxDelay 缺省为 5 分钟', async () => {
		vi.useFakeTimers();
		const wrapper = mountVegas([untilEnded, image]);
		await flushEffects();

		await advanceTimers(299999);
		expect(handleOf(wrapper).current()).toBe(0);

		await advanceTimers(1);
		expect(handleOf(wrapper).current()).toBe(1);
	});

	it('所有视频源都加载失败时直接切到下一张，不在封面上干等', async () => {
		vi.useFakeTimers();
		const wrapper = mountVegas([untilEnded, image]);
		await flushEffects();

		const sources = wrapper.findAll('source');
		sources[0].element.dispatchEvent(new Event('error'));
		await flushEffects();
		expect(handleOf(wrapper).current()).toBe(0);

		sources[1].element.dispatchEvent(new Event('error'));
		await flushEffects();
		expect(handleOf(wrapper).current()).toBe(1);
	});

	it('已选中的视频源播放途中出错（解码失败、断网）时直接切到下一张', async () => {
		vi.useFakeTimers();
		const wrapper = mountVegas([untilEnded, image]);
		await flushEffects();

		videoOf(wrapper).dispatchEvent(new Event('error'));
		await flushEffects();
		expect(handleOf(wrapper).current()).toBe(1);
	});

	it('只有一张时没有可切换的目标，按 video.loop 循环', async () => {
		const wrapper = mountVegas([untilEnded], { autoplay: false });
		await flushEffects();

		expect(videoOf(wrapper).loop).toBe(true);
	});

	it('首帧过渡期间就播完的短视频，进入播放阶段后立即切走', async () => {
		vi.useFakeTimers();
		const wrapper = mountVegas([untilEnded, image], { firstTransitionDuration: 2000 });
		await flushEffects();

		videoOf(wrapper).dispatchEvent(new Event('ended'));
		await flushEffects();
		expect(handleOf(wrapper).current()).toBe(0);

		await advanceTimers(2000);
		expect(handleOf(wrapper).current()).toBe(1);
	});

	it('图片幻灯片上的 \'video\' 无效，回落到全局 delay', async () => {
		vi.useFakeTimers();
		const wrapper = mountVegas([{ src: '/a.jpg', delay: 'video' }, image]);
		await flushEffects();

		await advanceTimers(5000);
		expect(handleOf(wrapper).current()).toBe(1);
	});

	it("animationDuration: 'auto' 在这类幻灯片上取全局 delay，而不是兜底上限", async () => {
		const wrapper = mountVegas([untilEnded, image], { autoplay: false, animation: 'kenburns' });
		await flushEffects();

		expect(videoOf(wrapper).style.animation).toContain('5000ms');
	});
});

describe('视频起播', () => {
	it('挂载时处于播放状态就主动调用 play()，不只依赖 autoplay 属性', async () => {
		const wrapper = mountVegas([{ src: '/poster.jpg', video: { src: ['/clip.mp4'] } }]);
		await flushEffects();

		expect(videoOf(wrapper).play).toHaveBeenCalled();
	});

	it('暂停状态挂载时不调用 play()', async () => {
		const wrapper = mount(Vegas, {
			props: {
				slides: [{ src: '/poster.jpg', video: { src: ['/clip.mp4'] } }],
				autoplay: false,
				firstTransitionDuration: 0,
			},
		});
		await flushEffects();

		expect(videoOf(wrapper).play).not.toHaveBeenCalled();
	});
});

describe('离场中的视频不再触发切换', () => {
	afterEach(() => {
		if (vi.isFakeTimers()) {
			vi.runOnlyPendingTimers();
			vi.useRealTimers();
		}
	});

	it('切走之后，上一张视频再播完、出错都不会连跳一张', async () => {
		vi.useFakeTimers();
		const wrapper = mountVegas([untilEnded, image, { src: '/image-2.jpg' }], { videoMaxDelay: 10000 });
		await flushEffects();

		// 拿住视频元素：兜底定时器切走后它进入离场（组件卸载或做离场动画），监听器仍挂在元素上
		const leavingVideo = videoOf(wrapper);
		const lastSource = wrapper.findAll('source')[1].element;
		await advanceTimers(10000);
		expect(handleOf(wrapper).current()).toBe(1);

		// 等切换锁释放，确保拦住 next() 的是渲染组件自己的判断而不是锁
		await advanceTimers(1000);
		leavingVideo.dispatchEvent(new Event('ended'));
		leavingVideo.dispatchEvent(new Event('error'));
		lastSource.dispatchEvent(new Event('error'));
		await flushEffects();

		expect(handleOf(wrapper).current()).toBe(1);
	});

	it('离场前记下的待切换，离场后也不会再触发', async () => {
		const next = vi.fn();
		let current = 0;
		const noop = () => {};
		const wrapper = mount(VegasSlideRenderer, {
			props: {
				slide: untilEnded,
				index: 0,
				cover: true,
				align: 'center',
				valign: 'center',
				color: null,
				animationName: null,
				animationDuration: 5000,
				isMediaPlaying: true,
				canAdvance: false,
				advanceOnEnded: true,
				getCurrentSlide: () => current,
				next,
				log: noop,
				logWarn: noop,
				logError: noop,
			},
		});

		wrapper.find('video').element.dispatchEvent(new Event('ended'));
		current = 1;
		await wrapper.setProps({ canAdvance: true });

		expect(next).not.toHaveBeenCalled();
	});
});
