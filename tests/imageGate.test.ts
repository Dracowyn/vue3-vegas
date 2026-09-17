import { mount } from '@vue/test-utils';
import { describe, expect, it, vi, afterEach } from 'vitest';
import Vegas from '../src/Vegas.vue';
import type { SlideProps, VegasHandle } from '../src/types';
import { advanceTimers, flushEffects } from './helpers';

/**
 * 可控的假 `Image`：`complete` 恒为 `false`，`load` / `error` 需要测试手动触发
 * （`instances` 按创建顺序收集）。用于验证「切换幻灯片前先等目标图片加载完」的门槛
 * 行为——tests/setup.ts 里的默认假 `Image` 恒为 `complete: true`，是这里特意要绕开的
 * 同步快路径。
 */
class ControlledImage {
	static instances: ControlledImage[] = [];
	complete = false;
	onload: (() => void) | null = null;
	onerror: (() => void) | null = null;
	src = '';

	constructor() {
		ControlledImage.instances.push(this);
	}
}

const useControlledImage = () => {
	const OriginalImage = global.Image;
	ControlledImage.instances = [];
	global.Image = ControlledImage as unknown as typeof Image;
	return () => {
		global.Image = OriginalImage;
	};
};

/** 按 src 找到最近一次创建的假图片实例——同一 src 可能因 loop 被再次请求 */
const controlledImageFor = (src: string): ControlledImage => {
	for (let i = ControlledImage.instances.length - 1; i >= 0; i--) {
		if (ControlledImage.instances[i].src === src) return ControlledImage.instances[i];
	}
	throw new Error(`未找到 src 为 ${src} 的假图片实例`);
};

/** 放行 next()/goTo() 之后最新创建的一张待提交图片（假定目标是图片幻灯片） */
const releaseLatestImage = () => {
	const latest = ControlledImage.instances[ControlledImage.instances.length - 1];
	latest?.onload?.();
};

const handleOf = (wrapper: ReturnType<typeof mount>) =>
	wrapper.vm as unknown as VegasHandle;

const isSlideVisible = (wrapper: ReturnType<typeof mount>, source: string) =>
	wrapper.find(`img[src="${source}"]`).exists();

const isDefaultBackgroundVisible = (wrapper: ReturnType<typeof mount>, source: string) =>
	wrapper.findAll('div').some(node =>
		(node.element as HTMLDivElement).style.backgroundImage?.includes(source)
	);

describe('导航前等待目标图片就绪', () => {
	const slides: SlideProps[] = [
		{ src: '/gate-a.jpg' },
		{ src: '/gate-b.jpg' },
		{ src: '/gate-c.jpg' },
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

	/** 挂载并放行首帧图片，跳过首帧门槛，专注测导航时的门槛 */
	const mountVegasReady = async (extraProps: Record<string, unknown> = {}) => {
		const wrapper = mountVegas(extraProps);
		await flushEffects();
		controlledImageFor('/gate-a.jpg').onload?.();
		await flushEffects();
		return wrapper;
	};

	afterEach(() => {
		if (vi.isFakeTimers()) {
			vi.runOnlyPendingTimers();
			vi.useRealTimers();
		}
	});

	it('目标图片未就绪时 next() 返回 true 但不提交，load 后才真正切换并上锁', async () => {
		const restore = useControlledImage();
		vi.useFakeTimers();
		const onWalk = vi.fn();
		const wrapper = await mountVegasReady({ onWalk });

		const handle = handleOf(wrapper);
		expect(handle.next()).toBe(true);
		await flushEffects();

		// 尚未提交：current、已挂载的旧 <img>、onWalk 都不变
		expect(handle.current()).toBe(0);
		expect(isSlideVisible(wrapper, '/gate-a.jpg')).toBe(true);
		expect(isSlideVisible(wrapper, '/gate-b.jpg')).toBe(false);
		expect(onWalk).not.toHaveBeenCalled();

		controlledImageFor('/gate-b.jpg').onload?.();
		await flushEffects();

		expect(handle.current()).toBe(1);
		expect(isSlideVisible(wrapper, '/gate-b.jpg')).toBe(true);
		expect(onWalk).toHaveBeenCalledTimes(1);
		expect(onWalk).toHaveBeenCalledWith(1, slides[1]);

		// 提交的同一刻才上过渡锁
		expect(handle.goTo(2)).toBe(false);
		await advanceTimers(1000);
		expect(handle.goTo(2)).toBe(true);

		restore();
	});

	it('目标图片加载失败（error）同样提交', async () => {
		const restore = useControlledImage();
		vi.useFakeTimers();
		const onWalk = vi.fn();
		const wrapper = await mountVegasReady({ onWalk });

		handleOf(wrapper).next();
		await flushEffects();
		controlledImageFor('/gate-b.jpg').onerror?.();
		await flushEffects();

		expect(handleOf(wrapper).current()).toBe(1);
		expect(onWalk).toHaveBeenCalledTimes(1);

		restore();
	});

	it('待提交期间再来一次导航会取代前一次，旧图片之后 load 不产生任何提交', async () => {
		const restore = useControlledImage();
		vi.useFakeTimers();
		const onWalk = vi.fn();
		const wrapper = await mountVegasReady({ onWalk });

		const handle = handleOf(wrapper);
		expect(handle.next()).toBe(true);
		await flushEffects();
		expect(handle.goTo(2)).toBe(true);
		await flushEffects();

		// 第一次请求的图片（b）之后才 load，不应该有任何效果
		controlledImageFor('/gate-b.jpg').onload?.();
		await flushEffects();
		expect(handle.current()).toBe(0);
		expect(onWalk).not.toHaveBeenCalled();

		controlledImageFor('/gate-c.jpg').onload?.();
		await flushEffects();
		expect(handle.current()).toBe(2);
		expect(onWalk).toHaveBeenCalledTimes(1);
		expect(onWalk).toHaveBeenCalledWith(2, slides[2]);

		restore();
	});

	it('目标是视频幻灯片时立即提交，不等待图片', async () => {
		const restore = useControlledImage();
		const wrapper = mount(Vegas, {
			props: {
				slides: [
					{ src: '/gate-a.jpg' },
					{ src: '/gate-video-poster.jpg', video: { src: ['/gate.mp4'] } },
				],
				autoplay: false,
				firstTransitionDuration: 0,
				transitionDuration: 1000,
			},
		});
		await flushEffects();
		controlledImageFor('/gate-a.jpg').onload?.();
		await flushEffects();

		expect(handleOf(wrapper).next()).toBe(true);
		await flushEffects();

		expect(handleOf(wrapper).current()).toBe(1);
		expect(wrapper.find('video').exists()).toBe(true);

		restore();
	});

	it('空源视频按图片幻灯片处理，需要等待 src 就绪', async () => {
		const restore = useControlledImage();
		const wrapper = mount(Vegas, {
			props: {
				slides: [
					{ src: '/gate-a.jpg' },
					{ src: '/gate-empty-video.jpg', video: { src: [] } },
				],
				autoplay: false,
				firstTransitionDuration: 0,
				transitionDuration: 1000,
			},
		});
		await flushEffects();
		controlledImageFor('/gate-a.jpg').onload?.();
		await flushEffects();

		expect(handleOf(wrapper).next()).toBe(true);
		await flushEffects();

		// 空源视频降级为图片，未 load 前不该提交
		expect(handleOf(wrapper).current()).toBe(0);

		controlledImageFor('/gate-empty-video.jpg').onload?.();
		await flushEffects();
		expect(handleOf(wrapper).current()).toBe(1);

		restore();
	});

	it('卸载组件后，待提交的图片再 load 不报错也不触发 onWalk', async () => {
		const restore = useControlledImage();
		const onWalk = vi.fn();
		const wrapper = await mountVegasReady({ onWalk });

		handleOf(wrapper).next();
		await flushEffects();

		wrapper.unmount();

		expect(() => controlledImageFor('/gate-b.jpg').onload?.()).not.toThrow();
		expect(onWalk).not.toHaveBeenCalled();

		restore();
	});

	it('shuffle 模式下,循环回绕处被取代的重洗计划不破坏 slideOrder（继续导航仍能不重不漏地走完幻灯片）', async () => {
		const restore = useControlledImage();
		vi.useFakeTimers();

		const wrapper = mount(Vegas, {
			props: {
				slides,
				autoplay: false,
				firstTransitionDuration: 0,
				transitionDuration: 1000,
				shuffle: true,
			},
		});
		await flushEffects();

		const handle = handleOf(wrapper);
		// 首帧下标由 shuffle 决定，不一定是 0，用 current() 反查对应 src 放行
		controlledImageFor(slides[handle.current()].src).onload?.();
		await flushEffects();

		const seen = new Set<number>([handle.current()]);

		// 提交后要等过渡锁释放（transitionDuration）才能发起下一次导航，
		// 否则 next()/goTo() 会因为「正在切换中」直接被拒绝
		const commitLatestAndUnlock = async () => {
			await flushEffects();
			releaseLatestImage();
			await flushEffects();
			await advanceTimers(1000);
		};

		// 走满一整轮减一步，逼近循环回绕点（下一次 next() 会触发重洗计划）
		for (let i = 0; i < slides.length - 1; i++) {
			handle.next();
			await commitLatestAndUnlock();
			seen.add(handle.current());
		}

		// 到达循环回绕点：next() 计划一次重洗但不提交
		handle.next();
		await flushEffects();

		// 立刻用另一次导航取代这个待提交的重洗计划
		const otherIndex = (handle.current() + 1) % slides.length;
		expect(handle.goTo(otherIndex)).toBe(true);
		await commitLatestAndUnlock();

		expect(handle.current()).toBe(otherIndex);
		seen.add(otherIndex);

		// 继续走完剩余的幻灯片：slideOrder 仍应是有效排列，不会因为被取代的重洗计划
		// 而损坏（越界下标、重复读同一元素等都会在这里露出来）
		for (let i = 0; i < slides.length; i++) {
			handle.next();
			await commitLatestAndUnlock();
			seen.add(handle.current());
		}

		expect([...seen].sort()).toEqual([0, 1, 2]);

		restore();
	});

	it('待提交期间 slides 被删到目标下标越界，不报错、不提交到越界下标（回归：状态重建曾悄悄丢弃待提交请求）', async () => {
		const restore = useControlledImage();
		vi.useFakeTimers();
		const wrapper = await mountVegasReady();
		const handle = handleOf(wrapper);

		expect(handle.goTo(2)).toBe(true);
		await flushEffects();

		// 删减到只剩 1 张，原目标下标 2 越界
		await wrapper.setProps({ slides: [slides[0]] });
		await flushEffects();

		// 重新发起的 goTo(2) 应因越界自然返回 false（内部丢弃，不影响这里已经返回过
		// 的 true），不抛错、不提交到越界下标
		expect(handle.current()).toBe(0);
		expect(isSlideVisible(wrapper, '/gate-a.jpg')).toBe(true);

		restore();
	});
});

describe('待提交期间 slides 被等长替换（内容变了但长度没变）', () => {
	const slides: SlideProps[] = [
		{ src: '/swap-a.jpg' },
		{ src: '/swap-b.jpg' },
		{ src: '/swap-c.jpg' },
	];

	const mountVegas = (extraProps: Record<string, unknown> = {}) => mount(Vegas, {
		props: {
			slides,
			autoplay: false,
			transitionDuration: 1000,
			firstTransitionDuration: 0,
			...extraProps,
		},
	});

	const mountVegasReady = async (extraProps: Record<string, unknown> = {}) => {
		const wrapper = mountVegas(extraProps);
		await flushEffects();
		controlledImageFor('/swap-a.jpg').onload?.();
		await flushEffects();
		return wrapper;
	};

	afterEach(() => {
		if (vi.isFakeTimers()) {
			vi.runOnlyPendingTimers();
			vi.useRealTimers();
		}
	});

	it('等长替换后旧图片才 load：不提交旧内容，改等新内容的图片，之后才提交新内容', async () => {
		const restore = useControlledImage();
		vi.useFakeTimers();
		const onWalk = vi.fn();
		const wrapper = await mountVegasReady({ onWalk });

		expect(handleOf(wrapper).next()).toBe(true);
		await flushEffects();

		const swappedB: SlideProps = { src: '/swap-b2.jpg' };
		await wrapper.setProps({
			slides: [slides[0], swappedB, slides[2]],
		});
		await flushEffects();

		// 放行的是「旧」B 的图片——此时它已经不是目标下标真正要等的内容了
		controlledImageFor('/swap-b.jpg').onload?.();
		await flushEffects();

		// 不该提交：这是过期的等待结果
		expect(handleOf(wrapper).current()).toBe(0);
		expect(onWalk).not.toHaveBeenCalled();

		// 应该已经改为等新内容（B2）的图片
		expect(() => controlledImageFor('/swap-b2.jpg')).not.toThrow();

		controlledImageFor('/swap-b2.jpg').onload?.();
		await flushEffects();

		expect(handleOf(wrapper).current()).toBe(1);
		expect(onWalk).toHaveBeenCalledTimes(1);
		expect(onWalk).toHaveBeenCalledWith(1, swappedB);

		restore();
	});

	it('等长替换后目标变成视频幻灯片：旧图片 load 后按新内容立即提交，不再等图片', async () => {
		const restore = useControlledImage();
		vi.useFakeTimers();
		const onWalk = vi.fn();
		const wrapper = await mountVegasReady({ onWalk });

		expect(handleOf(wrapper).next()).toBe(true);
		await flushEffects();

		const swappedB: SlideProps = { src: '/swap-b2-poster.jpg', video: { src: ['/swap-b2.mp4'] } };
		await wrapper.setProps({
			slides: [slides[0], swappedB, slides[2]],
		});
		await flushEffects();

		controlledImageFor('/swap-b.jpg').onload?.();
		await flushEffects();

		expect(handleOf(wrapper).current()).toBe(1);
		expect(onWalk).toHaveBeenCalledTimes(1);
		expect(onWalk).toHaveBeenCalledWith(1, swappedB);
		expect(wrapper.find('video').exists()).toBe(true);

		restore();
	});

	it('等长替换但目标的 src 没变（只改了别的幻灯片）：正常提交，不多等一轮', async () => {
		const restore = useControlledImage();
		vi.useFakeTimers();
		const onWalk = vi.fn();
		const wrapper = await mountVegasReady({ onWalk });

		expect(handleOf(wrapper).next()).toBe(true);
		await flushEffects();

		const swappedA: SlideProps = { src: '/swap-a2.jpg' };
		const swappedC: SlideProps = { src: '/swap-c2.jpg' };
		await wrapper.setProps({
			slides: [swappedA, slides[1], swappedC],
		});
		await flushEffects();

		const countBeforeRelease = ControlledImage.instances.length;
		controlledImageFor('/swap-b.jpg').onload?.();
		await flushEffects();

		expect(handleOf(wrapper).current()).toBe(1);
		expect(onWalk).toHaveBeenCalledTimes(1);
		expect(onWalk).toHaveBeenCalledWith(1, slides[1]);
		// 不该因为这次替换多创建等待用的图片实例
		expect(ControlledImage.instances.length).toBe(countBeforeRelease);

		restore();
	});
});

describe('自动播放遇到未就绪的图片', () => {
	const slides: SlideProps[] = [
		{ src: '/gate-auto-a.jpg' },
		{ src: '/gate-auto-b.jpg' },
	];

	afterEach(() => {
		if (vi.isFakeTimers()) {
			vi.runOnlyPendingTimers();
			vi.useRealTimers();
		}
	});

	it('delay 到点但图片未就绪时不提交、不重复调用 next；load 后提交并正常安排下一轮', async () => {
		const restore = useControlledImage();
		vi.useFakeTimers();
		const wrapper = mount(Vegas, {
			props: {
				slides,
				autoplay: true,
				delay: 1000,
				transitionDuration: 200,
				firstTransitionDuration: 0,
			},
		});
		await flushEffects();
		controlledImageFor('/gate-auto-a.jpg').onload?.();
		await flushEffects();

		await advanceTimers(1000);
		expect(handleOf(wrapper).current()).toBe(0);

		// 再多等几轮 delay，仍不该重复触发（否则会不断创建新的假图片实例）
		const countAfterFirstDelay = ControlledImage.instances.length;
		await advanceTimers(5000);
		expect(ControlledImage.instances.length).toBe(countAfterFirstDelay);
		expect(handleOf(wrapper).current()).toBe(0);

		controlledImageFor('/gate-auto-b.jpg').onload?.();
		await flushEffects();
		expect(handleOf(wrapper).current()).toBe(1);

		// 过渡锁释放后应正常安排下一轮定时器，走到下一张（循环回第一张）
		await advanceTimers(200);
		await advanceTimers(1000);
		controlledImageFor('/gate-auto-a.jpg').onload?.();
		await flushEffects();
		expect(handleOf(wrapper).current()).toBe(0);

		restore();
	});

	it('待提交期间 slides 追加导致状态重建时不会丢失导航，过渡结束后自动播放继续（回归：曾经会永久停摆）', async () => {
		const restore = useControlledImage();
		vi.useFakeTimers();
		const wrapper = mount(Vegas, {
			props: {
				slides,
				autoplay: true,
				delay: 1000,
				transitionDuration: 200,
				firstTransitionDuration: 0,
			},
		});
		await flushEffects();
		controlledImageFor('/gate-auto-a.jpg').onload?.();
		await flushEffects();

		// delay 到点，next() 被自动播放的定时器调用，目标 b 尚未就绪，进入待提交
		await advanceTimers(1000);
		expect(handleOf(wrapper).current()).toBe(0);

		// 懒加载追加一张幻灯片：这正是「slides 长度变化保留播放位置」的主打场景，
		// 会触发 handleSlidesLengthChange 重建 slideOrder——这次重建不该悄悄丢弃
		// 上面那次待提交的导航
		await wrapper.setProps({ slides: [...slides, { src: '/gate-auto-c.jpg' }] });
		await flushEffects();

		// 重新发起后的目标仍是 b（顺序未变，只是长度变了），放行它的图片
		controlledImageFor('/gate-auto-b.jpg').onload?.();
		await flushEffects();
		expect(handleOf(wrapper).current()).toBe(1);

		// 过渡结束后应正常安排下一轮定时器，自动播放不应永久停摆
		await advanceTimers(200);
		await advanceTimers(1000);
		controlledImageFor('/gate-auto-c.jpg').onload?.();
		await flushEffects();
		expect(handleOf(wrapper).current()).toBe(2);

		restore();
	});
});

describe('首帧图片就绪门槛', () => {
	afterEach(() => {
		if (vi.isFakeTimers()) {
			vi.runOnlyPendingTimers();
			vi.useRealTimers();
		}
	});

	it('首张图片未就绪时不渲染任何 <img>，load 后才进入首帧', async () => {
		const restore = useControlledImage();
		vi.useFakeTimers();
		const wrapper = mount(Vegas, {
			props: {
				slides: [{ src: '/gate-first.jpg' }, { src: '/gate-second.jpg' }],
				autoplay: false,
				firstTransitionDuration: 0,
			},
		});
		await flushEffects();

		expect(wrapper.find('img').exists()).toBe(false);

		controlledImageFor('/gate-first.jpg').onload?.();
		await flushEffects();

		expect(isSlideVisible(wrapper, '/gate-first.jpg')).toBe(true);

		restore();
	});

	it('有默认背景时，图片未就绪期间背景保持显示', async () => {
		const restore = useControlledImage();
		vi.useFakeTimers();
		const wrapper = mount(Vegas, {
			props: {
				slides: [{ src: '/gate-first.jpg' }],
				autoplay: false,
				firstTransitionDuration: 0,
				defaultBackground: '/gate-bg.jpg',
				defaultBackgroundDuration: 100,
			},
		});
		await flushEffects();
		await advanceTimers(100);
		await flushEffects();

		// 背景时长已走完，但图片仍未就绪，背景应继续显示，不渲染首帧 <img>
		expect(isDefaultBackgroundVisible(wrapper, '/gate-bg.jpg')).toBe(true);
		expect(wrapper.find('img').exists()).toBe(false);

		controlledImageFor('/gate-first.jpg').onload?.();
		await flushEffects();

		expect(isSlideVisible(wrapper, '/gate-first.jpg')).toBe(true);
		expect(isDefaultBackgroundVisible(wrapper, '/gate-bg.jpg')).toBe(false);

		restore();
	});

	it('图片先于默认背景时长就绪时，仍等背景时长走完才进入首帧（两者并行而非串行叠加）', async () => {
		const restore = useControlledImage();
		vi.useFakeTimers();
		const wrapper = mount(Vegas, {
			props: {
				slides: [{ src: '/gate-first.jpg' }],
				autoplay: false,
				firstTransitionDuration: 0,
				defaultBackground: '/gate-bg.jpg',
				defaultBackgroundDuration: 1000,
			},
		});
		await flushEffects();

		// 图片提前就绪
		controlledImageFor('/gate-first.jpg').onload?.();
		await flushEffects();

		// 背景时长还没走完，不该提前进入首帧
		expect(wrapper.find('img').exists()).toBe(false);
		expect(isDefaultBackgroundVisible(wrapper, '/gate-bg.jpg')).toBe(true);

		await advanceTimers(1000);
		await flushEffects();

		expect(isSlideVisible(wrapper, '/gate-first.jpg')).toBe(true);

		restore();
	});

	it('等长替换（内容变了但长度没变）：旧首帧图片 load 后不提前进入首帧，改等新内容的图片', async () => {
		const restore = useControlledImage();
		vi.useFakeTimers();
		const wrapper = mount(Vegas, {
			props: {
				slides: [{ src: '/gate-first.jpg' }, { src: '/gate-second.jpg' }],
				autoplay: false,
				firstTransitionDuration: 0,
			},
		});
		await flushEffects();

		const swappedFirst: SlideProps = { src: '/gate-first-2.jpg' };
		await wrapper.setProps({
			slides: [swappedFirst, { src: '/gate-second.jpg' }],
		});
		await flushEffects();

		// 放行的是旧内容的图片——此时首帧要等的已经是新内容了
		controlledImageFor('/gate-first.jpg').onload?.();
		await flushEffects();

		expect(wrapper.find('img').exists()).toBe(false);

		controlledImageFor('/gate-first-2.jpg').onload?.();
		await flushEffects();

		expect(isSlideVisible(wrapper, '/gate-first-2.jpg')).toBe(true);

		restore();
	});

	it('首张是视频幻灯片时不等待图片', async () => {
		const restore = useControlledImage();
		vi.useFakeTimers();
		const wrapper = mount(Vegas, {
			props: {
				slides: [{ src: '/gate-poster.jpg', video: { src: ['/gate.mp4'] } }],
				autoplay: false,
				firstTransitionDuration: 0,
			},
		});
		await flushEffects();

		expect(wrapper.find('video').exists()).toBe(true);

		restore();
	});
});
