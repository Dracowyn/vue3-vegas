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
});
