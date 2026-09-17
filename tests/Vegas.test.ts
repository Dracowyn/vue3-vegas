import { mount } from '@vue/test-utils';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { nextTick } from 'vue';
import Vegas from '../src/Vegas.vue';
import { advanceTimers, capturePreloadedVideos, flushEffects } from './helpers';

const slides = [
	{ src: '/slide-1.jpg' },
	{ src: '/slide-2.jpg' },
];

const findSlideBySource = (wrapper: ReturnType<typeof mount>, source: string) =>
	wrapper.find(`img[src="${source}"]`).exists() ||
	wrapper.findAll('div').some(node =>
		(node.element as HTMLDivElement).style.backgroundImage?.includes(source)
	);

// 读取某张幻灯片媒体元素上的 animation 简写值（未设置动画时为空串）
const readSlideAnimation = (wrapper: ReturnType<typeof mount>, source: string) => {
	const img = wrapper.find(`img[src="${source}"]`);
	expect(img.exists()).toBe(true);
	return (img.element as HTMLImageElement).style.animation;
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

	it('preloads video sources into detached <video> elements and releases them on unmount', async () => {
		const capture = capturePreloadedVideos();

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

		expect(capture.preloaded()).toEqual([['/intro.mp4', '/intro.webm']]);

		const [preloader] = capture.elements();
		expect(preloader.preload).toBe('auto');
		// 预热 HTTP 缓存用，绝不能挂进文档——挂进去就成了页面上一个看不见的播放器
		expect(preloader.parentNode).toBeNull();

		wrapper.unmount();

		// 卸载后清空源，让浏览器中断还没下完的下载
		expect(preloader.querySelectorAll('source')).toHaveLength(0);

		capture.restore();
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

			// 首帧下标（slide-1.jpg）会多出现一次：useVegasLifecycle 进入 firstSlide 前
			// 会独立等待首张幻灯片图片就绪（与本次 preloadImage 批量预加载并行发起，
			// 详见 src/composables/useVegasLifecycle.ts），产生一次额外的 `new Image()`
			expect(createdSrcs).toEqual(['/slide-1.jpg', '/slide-1.jpg', '/slide-2.jpg']);
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

			// 首帧下标（slide-1.jpg）会多出现一次：useVegasLifecycle 进入 firstSlide 前
			// 会独立等待首张幻灯片图片就绪（与本次 preloadImage 批量预加载并行发起，
			// 详见 src/composables/useVegasLifecycle.ts），产生一次额外的 `new Image()`
			expect(createdSrcs).toEqual(['/slide-1.jpg', '/slide-1.jpg', '/slide-2.jpg']);
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

	it('isolates the root container into its own stacking context', async () => {
		// 根容器必须创建独立层叠上下文，否则内部 z-index（overlay/timer/loader）
		// 会与宿主页面的兄弟元素相互影响
		const wrapper = mount(Vegas, {
			props: {
				slides: [slides[0]],
				autoplay: false,
				firstTransitionDuration: 0,
			},
		});

		await flushEffects();

		const container = wrapper.element as HTMLDivElement;
		expect(container.style.isolation).toBe('isolate');
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

	it('applies a Ken Burns animation to the slide media', async () => {
		const wrapper = mount(Vegas, {
			props: {
				slides: [slides[0]],
				autoplay: false,
				animation: 'kenburnsUp',
				animationDuration: 4000,
				firstTransitionDuration: 0,
			},
		});

		await flushEffects();

		const img = wrapper.find(`img[src="${slides[0].src}"]`);
		expect(img.exists()).toBe(true);
		expect((img.element as HTMLImageElement).style.animation)
			.toContain('vue3-vegas-kenburnsUp');
	});

	it('injects the Ken Burns keyframes exactly once for two instances', async () => {
		document.head.querySelectorAll('style[data-vue3-vegas-keyframes]')
			.forEach(node => node.remove());

		mount(Vegas, {
			props: { slides: [slides[0]], autoplay: false, firstTransitionDuration: 0 },
		});
		mount(Vegas, {
			props: { slides: [slides[1]], autoplay: false, firstTransitionDuration: 0 },
		});

		await flushEffects();

		expect(document.head.querySelectorAll('style[data-vue3-vegas-keyframes]'))
			.toHaveLength(1);
	});

	it('no longer injects a default-value stylesheet for the tuning CSS variables', async () => {
		document.head.querySelectorAll('style[data-vue3-vegas-root]')
			.forEach(node => node.remove());

		const wrapper = mount(Vegas, {
			props: { slides: [slides[0]], autoplay: false, firstTransitionDuration: 0 },
			attachTo: document.body,
		});

		await flushEffects();

		// 默认值现在写在 var(--x, 默认值) 的回退里，不再需要注入样式表
		expect(document.head.querySelector('style[data-vue3-vegas-root]')).toBeNull();
		// Ken Burns 的 keyframes 注入机制不受影响，仍然存在
		expect(document.head.querySelector('style[data-vue3-vegas-keyframes]')).not.toBeNull();
		// 根元素仍带这个类，方便使用者用它当选择器覆盖调节变量
		expect((wrapper.element as HTMLDivElement).classList.contains('vue3-vegas-root'))
			.toBe(true);

		wrapper.unmount();
	});

	it('lets a user stylesheet override the tuning CSS variables', async () => {
		const userStyle = document.createElement('style');
		userStyle.textContent = '.tuned{--vegas-zoom-scale:5}';
		document.head.appendChild(userStyle);

		const wrapper = mount(Vegas, {
			props: { slides: [slides[0]], autoplay: false, firstTransitionDuration: 0 },
			attrs: { class: 'tuned' },
			attachTo: document.body,
		});

		await flushEffects();

		const computed = window.getComputedStyle(wrapper.element as HTMLDivElement);
		expect(computed.getPropertyValue('--vegas-zoom-scale').trim()).toBe('5');

		wrapper.unmount();
		userStyle.remove();
	});

	it('re-resolves the Ken Burns animation when the animation prop changes', async () => {
		const wrapper = mount(Vegas, {
			props: {
				slides: [slides[0]],
				autoplay: false,
				firstTransitionDuration: 0,
			},
		});

		await flushEffects();

		// 初始未配置动画
		expect(readSlideAnimation(wrapper, slides[0].src)).toBe('');

		await wrapper.setProps({ animation: 'kenburnsUp' });
		await flushEffects();

		expect(readSlideAnimation(wrapper, slides[0].src)).toContain('vue3-vegas-kenburnsUp');

		// 单张幻灯片场景下也要能继续改
		await wrapper.setProps({ animation: 'kenburnsDown' });
		await flushEffects();

		expect(readSlideAnimation(wrapper, slides[0].src)).toContain('vue3-vegas-kenburnsDown');

		// 关掉动画同样要生效
		await wrapper.setProps({ animation: null });
		await flushEffects();

		expect(readSlideAnimation(wrapper, slides[0].src)).toBe('');
	});

	// 原版语义：register 把自定义名并入内置池供 'random' 抽取，不是限定候选池。
	// 用 mock Math.random 命中"池尾"（fallbackPool.concat(register) 里 register 追加的那份），
	// 既验证了 register 真的参与了候选池，也验证了 register 变化会触发重新解析。
	it('re-resolves the random animation when the register pool changes, always able to pick the registered name', async () => {
		const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.999);

		try {
			const wrapper = mount(Vegas, {
				props: {
					slides: [slides[0]],
					autoplay: false,
					animation: 'random',
					animationRegister: ['kenburnsLeft'],
					firstTransitionDuration: 0,
				},
			});

			await flushEffects();

			expect(readSlideAnimation(wrapper, slides[0].src)).toContain('vue3-vegas-kenburnsLeft');

			await wrapper.setProps({ animationRegister: ['kenburnsRight'] });
			await flushEffects();

			expect(readSlideAnimation(wrapper, slides[0].src)).toContain('vue3-vegas-kenburnsRight');
		} finally {
			randomSpy.mockRestore();
		}
	});

	it('merges a registered custom transition name into the random pool', async () => {
		const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.999);

		try {
			const wrapper = mount(Vegas, {
				props: {
					slides,
					autoplay: false,
					transition: 'random',
					transitionRegister: ['myFade'],
					firstTransitionDuration: 0,
				},
			});

			await flushEffects();

			// 候选池 = 全部内置过渡 + ['myFade']，0.999 命中池尾即注册的自定义名——
			// 证明 register 确实并入了候选池，而不仅仅是被当作合法名单
			const slideEl = wrapper.find('[data-transition-name]');
			expect(slideEl.attributes('data-transition-name')).toBe('myFade');
		} finally {
			randomSpy.mockRestore();
		}
	});

	it('restricts the transition candidates to the array when transition is passed as an array', async () => {
		const wrapper = mount(Vegas, {
			props: {
				slides,
				autoplay: false,
				transition: ['blur', 'swirlLeft'],
				firstTransitionDuration: 0,
			},
		});

		await flushEffects();

		const slideEl = wrapper.find('[data-transition-name]');
		expect(slideEl.exists()).toBe(true);
		expect(['blur', 'swirlLeft']).toContain(slideEl.attributes('data-transition-name'));
	});

	it('switches slides normally when transition is given as an array', async () => {
		vi.useFakeTimers();

		const wrapper = mount(Vegas, {
			props: {
				slides,
				autoplay: false,
				transition: ['fade2'],
				transitionDuration: 1000,
				firstTransitionDuration: 0,
			},
		});

		await flushEffects();
		expect(findSlideBySource(wrapper, slides[0].src)).toBe(true);

		(wrapper.vm as unknown as { next: () => void }).next();
		await advanceTimers(1000);

		expect(findSlideBySource(wrapper, slides[1].src)).toBe(true);
	});

	it('restricts the animation candidates to the array when animation is passed as an array', async () => {
		const wrapper = mount(Vegas, {
			props: {
				slides: [slides[0]],
				autoplay: false,
				animation: ['kenburnsLeft', 'kenburnsRight'],
				firstTransitionDuration: 0,
			},
		});

		await flushEffects();

		const animation = readSlideAnimation(wrapper, slides[0].src);
		const inPool = ['vue3-vegas-kenburnsLeft', 'vue3-vegas-kenburnsRight']
			.some(name => animation.includes(name));
		expect(inPool).toBe(true);
	});

	it('keeps the random Ken Burns pick stable across a phase change', async () => {
		vi.useFakeTimers();

		// register 合并进内置池后候选池 = 9 个内置 + 2 个 register（追加在尾部）共 11 个。
		// 让连续两次抽取必定落在不同的名字上：首次取池首(kenburns),之后取池尾(register
		// 追加的那份 kenburnsDown)。这样一旦发生重抽,动画名就会变,断言即可捕获。
		let drawCount = 0;
		const randomSpy = vi.spyOn(Math, 'random')
			.mockImplementation(() => (drawCount++ === 0 ? 0 : 0.99));

		try {
			const wrapper = mount(Vegas, {
				props: {
					slides: [slides[0]],
					autoplay: true,
					// 停留时长远大于首帧时长,确保观察窗口内不会切换幻灯片
					delay: 100000,
					animation: 'random',
					animationRegister: ['kenburnsUp', 'kenburnsDown'],
					firstTransitionDuration: 1000,
				},
			});

			await flushEffects();

			const initial = readSlideAnimation(wrapper, slides[0].src);
			// 结尾带空格，与 kenburnsUp / kenburnsDown 等前缀相同的名字区分开
			expect(initial).toContain('vue3-vegas-kenburns ');

			// firstSlide → playing：phase 变了但幻灯片没变,动画不应重抽
			await advanceTimers(1000);

			expect(readSlideAnimation(wrapper, slides[0].src)).toBe(initial);
		} finally {
			randomSpy.mockRestore();
		}
	});

	it('uses the slide delay as the auto animation duration', async () => {
		const wrapper = mount(Vegas, {
			props: {
				slides: [{ src: '/auto-delay.jpg', delay: 7000 }],
				autoplay: false,
				delay: 5000,
				animation: 'kenburns',
				// animationDuration 缺省即 'auto',应取该张幻灯片自己的 delay
				firstTransitionDuration: 0,
			},
		});

		await flushEffects();

		const animation = readSlideAnimation(wrapper, '/auto-delay.jpg');
		expect(animation).toContain('7000ms');
		expect(animation).not.toContain('5000ms');
	});

	it('lets a slide override the global animation and animation duration', async () => {
		const wrapper = mount(Vegas, {
			props: {
				slides: [{ src: '/override.jpg', animation: 'kenburnsDown', animationDuration: 1234 }],
				autoplay: false,
				animation: 'kenburnsUp',
				animationDuration: 9000,
				firstTransitionDuration: 0,
			},
		});

		await flushEffects();

		const animation = readSlideAnimation(wrapper, '/override.jpg');
		expect(animation).toContain('vue3-vegas-kenburnsDown');
		expect(animation).toContain('1234ms');
		expect(animation).not.toContain('vue3-vegas-kenburnsUp');
		expect(animation).not.toContain('9000ms');
	});

	it('falls back to fade and drops unknown effect names, warning in debug mode', async () => {
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

		try {
			const wrapper = mount(Vegas, {
				props: {
					slides: [slides[0]],
					autoplay: false,
					transition: 'notATransition',
					animation: 'notAnAnimation',
					debug: true,
					firstTransitionDuration: 0,
				},
			});

			await flushEffects();

			// 未知过渡回退到 fade
			expect(wrapper.find('[data-transition-name]').attributes('data-transition-name')).toBe('fade');
			// 未知动画直接忽略,媒体元素上不应有 animation
			expect(readSlideAnimation(wrapper, slides[0].src)).toBe('');

			const warnings = warnSpy.mock.calls
				.flat()
				.filter((arg): arg is string => typeof arg === 'string');
			expect(warnings.some(message => message.includes('notATransition'))).toBe(true);
			expect(warnings.some(message => message.includes('notAnAnimation'))).toBe(true);
		} finally {
			warnSpy.mockRestore();
			logSpy.mockRestore();
		}
	});
});
