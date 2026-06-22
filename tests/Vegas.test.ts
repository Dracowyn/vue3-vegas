import { mount, flushPromises } from '@vue/test-utils';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { nextTick, ref } from 'vue';
import Vegas from '../src/Vegas.vue';

const slides = [
	{ src: '/slide-1.jpg' },
	{ src: '/slide-2.jpg' },
];

const findSlideBySource = (wrapper: ReturnType<typeof mount>, source: string) =>
	wrapper.find(`img[src="${source}"]`).exists() ||
	wrapper.findAll('div').some(node =>
		(node.element as HTMLDivElement).style.backgroundImage?.includes(source)
	);

const advanceTimers = async (duration: number) => {
	vi.advanceTimersByTime(duration);
	await flushPromises();
	await nextTick();
};

const flushEffects = async () => {
	await flushPromises();
	await nextTick();
};

describe('Vegas', () => {
	afterEach(() => {
		if (vi.isFakeTimers()) {
			vi.runOnlyPendingTimers();
			vi.useRealTimers();
		}
	});

	it('renders the first slide even when autoplay is disabled', async () => {
		const wrapper = mount(Vegas, {
			props: {
				slides: [slides[0]],
				autoplay: false,
				firstTransitionDuration: 0,
			},
		});

		await flushEffects();

		expect(findSlideBySource(wrapper, slides[0].src)).toBe(true);
	});

	it('keeps the current slide mounted when pause is called', async () => {
		const wrapper = mount(Vegas, {
			props: {
				slides: [slides[0]],
				autoplay: true,
				firstTransitionDuration: 0,
			},
		});

		await flushEffects();

		expect(findSlideBySource(wrapper, slides[0].src)).toBe(true);

		const vm = wrapper.vm as unknown as { pause: () => void };
		vm.pause();
		await nextTick();

		expect(findSlideBySource(wrapper, slides[0].src)).toBe(true);
	});

	it('honors the default background before autoplay advances', async () => {
		vi.useFakeTimers();

		const wrapper = mount(Vegas, {
			props: {
				slides,
				autoplay: true,
				delay: 500,
				transitionDuration: 1,
				firstTransitionDuration: 1500,
				defaultBackground: '/loading.jpg',
				defaultBackgroundDuration: 1000,
			},
		});

		await flushEffects();

		// Default background should be visible
		const bgDiv = wrapper.findAll('div').find(node =>
			(node.element as HTMLDivElement).style.backgroundImage?.includes('/loading.jpg')
		);
		expect(bgDiv).toBeTruthy();

		// Advance past default background duration
		await advanceTimers(1000);

		// First slide should be visible
		expect(findSlideBySource(wrapper, slides[0].src)).toBe(true);
		expect(findSlideBySource(wrapper, slides[1].src)).toBe(false);
	});

	it('preloads video sources and cleans them up on unmount', async () => {
		const wrapper = mount(Vegas, {
			props: {
				slides: [{
					src: '/poster.jpg',
					video: {
						src: ['/intro.mp4', '/intro.webm'],
						muted: true,
					},
				}],
				autoplay: false,
				preload: true,
				preloadVideo: true,
				firstTransitionDuration: 0,
			},
		});

		await flushEffects();

		// Wait for preload links to be added
		await new Promise(resolve => setTimeout(resolve, 50));

		const preloadLinks = Array.from(document.head.querySelectorAll('link[rel="preload"]'));
		const preloadSources = preloadLinks.map(link => link.getAttribute('href'));

		expect(preloadSources).toEqual(['/intro.mp4', '/intro.webm']);

		wrapper.unmount();

		expect(document.head.querySelectorAll('link[rel="preload"]')).toHaveLength(0);
	});

	it('preloads images when only preloadImage is enabled (no master preload)', async () => {
		const createdSrcs: string[] = [];

		class FakeImage {
			onload: (() => void) | null = null;
			onerror: (() => void) | null = null;
			private _src = '';
			set src(value: string) {
				this._src = value;
				createdSrcs.push(value);
				// 模拟浏览器异步触发 onload
				Promise.resolve().then(() => this.onload?.());
			}
			get src() {
				return this._src;
			}
		}

		const OriginalImage = global.Image;
		global.Image = FakeImage as unknown as typeof Image;

		try {
			mount(Vegas, {
				props: {
					slides,
					autoplay: false,
					// 故意只开 preloadImage,不开主开关 preload
					preloadImage: true,
					firstTransitionDuration: 0,
				},
			});

			await flushEffects();
			await flushEffects();

			expect(createdSrcs).toEqual(['/slide-1.jpg', '/slide-2.jpg']);
		} finally {
			global.Image = OriginalImage;
		}
	});

	it('preloads images when the master preload flag is enabled', async () => {
		const createdSrcs: string[] = [];

		class FakeImage {
			onload: (() => void) | null = null;
			onerror: (() => void) | null = null;
			private _src = '';
			set src(value: string) {
				this._src = value;
				createdSrcs.push(value);
				Promise.resolve().then(() => this.onload?.());
			}
			get src() {
				return this._src;
			}
		}

		const OriginalImage = global.Image;
		global.Image = FakeImage as unknown as typeof Image;

		try {
			mount(Vegas, {
				props: {
					slides,
					autoplay: false,
					// 主开关应同时触发图片预加载（与原版 Vegas.js 语义一致）
					preload: true,
					firstTransitionDuration: 0,
				},
			});

			await flushEffects();
			await flushEffects();

			expect(createdSrcs).toEqual(['/slide-1.jpg', '/slide-2.jpg']);
		} finally {
			global.Image = OriginalImage;
		}
	});

	it('returns null when slides array is empty', async () => {
		const wrapper = mount(Vegas, {
			props: {
				slides: [],
			},
		});

		await flushEffects();

		// Should not render the main container div
		expect(wrapper.find('div').exists()).toBe(false);
	});

	it('shows overlay when overlay prop is true', async () => {
		const wrapper = mount(Vegas, {
			props: {
				slides: [slides[0]],
				overlay: true,
				overlayColor: 'rgba(0, 0, 0, 0.5)',
				firstTransitionDuration: 0,
			},
		});

		await flushEffects();

		const overlayDiv = wrapper.findAll('div').find(node => {
			const style = (node.element as HTMLDivElement).style;
			return style.background.includes('rgba') || style.backgroundColor?.includes('rgba');
		});
		expect(overlayDiv).toBeTruthy();
	});

	it('exposes next/previous/play/pause methods', async () => {
		const wrapper = mount(Vegas, {
			props: {
				slides,
				autoplay: false,
				firstTransitionDuration: 0,
			},
		});

		await flushEffects();

		const vm = wrapper.vm as unknown as {
			next: () => void;
			previous: () => void;
			play: () => void;
			pause: () => void;
		};

		expect(typeof vm.next).toBe('function');
		expect(typeof vm.previous).toBe('function');
		expect(typeof vm.play).toBe('function');
		expect(typeof vm.pause).toBe('function');
	});

	it('holds the transition lock for the incoming slide custom duration', async () => {
		vi.useFakeTimers();

		const wrapper = mount(Vegas, {
			props: {
				slides: [
					{ src: '/a.jpg' },
					{ src: '/b.jpg', transitionDuration: 3000 },
					{ src: '/c.jpg' },
				],
				autoplay: false,
				transition: 'fade',
				transitionDuration: 1000,
				firstTransitionDuration: 0,
			},
		});

		await flushEffects();

		const vm = wrapper.vm as unknown as { next: () => void };

		// A -> B：B 的进入动画时长是 3000ms，锁应保持 3000ms。
		vm.next();
		await flushEffects();
		expect(findSlideBySource(wrapper, '/b.jpg')).toBe(true);

		// 推进基础时长 1000ms —— 旧代码会在这里就释放锁。
		await advanceTimers(1000);

		// 锁应仍被持有：再次 next 应被忽略，停留在 B，不应进入 C。
		vm.next();
		await flushEffects();
		expect(findSlideBySource(wrapper, '/c.jpg')).toBe(false);

		// 推进剩余的 2000ms，B 的进入动画结束，锁释放。
		await advanceTimers(2000);
		vm.next();
		await flushEffects();
		expect(findSlideBySource(wrapper, '/c.jpg')).toBe(true);
	});

	it('does not warn on duplicate keys when slides share the same src', async () => {
		vi.useFakeTimers();
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

		try {
			const wrapper = mount(Vegas, {
				props: {
					slides: [{ src: '/dup.jpg' }, { src: '/dup.jpg' }],
					autoplay: false,
					transition: 'fade',
					transitionDuration: 100,
					firstTransitionDuration: 0,
				},
			});

			await flushEffects();

			// 切换时,离开与进入的两张幻灯片同时在 DOM 中且 src 相同。
			(wrapper.vm as unknown as { next: () => void }).next();
			await flushEffects();

			const dupKeyWarning = warnSpy.mock.calls.some(callArgs =>
				callArgs.some(arg => typeof arg === 'string' && arg.includes('Duplicate keys'))
			);
			expect(dupKeyWarning).toBe(false);
		} finally {
			warnSpy.mockRestore();
		}
	});

	it('marks decorative slide images as aria-hidden', async () => {
		const wrapper = mount(Vegas, {
			props: {
				slides: [slides[0]],
				autoplay: false,
				firstTransitionDuration: 0,
			},
		});

		await flushEffects();

		const img = wrapper.find(`img[src="${slides[0].src}"]`);
		expect(img.exists()).toBe(true);
		expect(img.attributes('aria-hidden')).toBe('true');
	});
});
