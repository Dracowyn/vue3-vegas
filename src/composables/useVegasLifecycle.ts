import { ref, watch, onMounted, onUnmounted } from 'vue';
import type { Logger, VegasPhase } from '../types';

export const useVegasLifecycle = (
	getPreload: () => boolean,
	getAutoplay: () => boolean,
	getHasDefaultBackground: () => boolean,
	getDefaultBackgroundDuration: () => number,
	getFirstTransitionDuration: () => number,
	preloadResources: () => Promise<void>,
	log: () => Logger
) => {
	const phase = ref<VegasPhase>('idle');
	let backgroundTimer: number | null = null;
	let firstSlideTimer: number | null = null;
	let lifecycleId = 0;

	const clearTimer = (timer: number | null) => {
		if (timer !== null) clearTimeout(timer);
	};

	const clearTimers = () => {
		clearTimer(backgroundTimer);
		backgroundTimer = null;
		clearTimer(firstSlideTimer);
		firstSlideTimer = null;
	};

	const enterPlaybackPhase = (targetPhase: 'playing' | 'paused') => {
		clearTimer(firstSlideTimer);
		firstSlideTimer = null;
		phase.value = targetPhase;
	};

	const play = () => {
		if (phase.value === 'paused' || phase.value === 'firstSlide') {
			clearTimer(firstSlideTimer);
			firstSlideTimer = null;
			phase.value = 'playing';
		}
	};

	const pause = () => {
		if (phase.value === 'playing' || phase.value === 'firstSlide') {
			clearTimer(firstSlideTimer);
			firstSlideTimer = null;
			phase.value = 'paused';
		}
	};

	const runLifecycle = async () => {
		const currentLifecycleId = ++lifecycleId;
		clearTimers();
		phase.value = 'idle';

		if (getPreload()) {
			log()('进入预加载阶段');
			phase.value = 'preloading';
			await preloadResources();
			if (lifecycleId !== currentLifecycleId) return;
		}

		if (getHasDefaultBackground()) {
			log()(`进入默认背景阶段，持续 ${getDefaultBackgroundDuration()}ms`);
			phase.value = 'showingDefaultBackground';

			await new Promise<void>(resolve => {
				backgroundTimer = window.setTimeout(resolve, getDefaultBackgroundDuration());
			});

			if (lifecycleId !== currentLifecycleId) return;
		}

		log()('进入首帧阶段');
		phase.value = 'firstSlide';

		if (getFirstTransitionDuration() <= 0) {
			enterPlaybackPhase(getAutoplay() ? 'playing' : 'paused');
			return;
		}

		firstSlideTimer = window.setTimeout(() => {
			if (lifecycleId !== currentLifecycleId) return;
			enterPlaybackPhase(getAutoplay() ? 'playing' : 'paused');
		}, getFirstTransitionDuration());
	};

	// Start lifecycle only on the client to avoid window/document access
	// during SSR and prevent hydration mismatches.
	onMounted(() => { void runLifecycle(); });

	// Re-run lifecycle when relevant props change after mount.
	watch(
		[getPreload, getAutoplay, getHasDefaultBackground, getDefaultBackgroundDuration, getFirstTransitionDuration],
		() => { void runLifecycle(); }
	);

	onUnmounted(() => {
		lifecycleId++;
		clearTimers();
	});

	const isPlaying = () => phase.value === 'playing';
	const isFirstTransition = () => phase.value === 'firstSlide';
	const shouldRenderSlides = () =>
		phase.value === 'firstSlide' || phase.value === 'playing' || phase.value === 'paused';
	const showDefaultBackground = () =>
		phase.value === 'showingDefaultBackground' || phase.value === 'firstSlide';
	const isDefaultBackgroundLeaving = () => phase.value === 'firstSlide';

	return {
		phase,
		isPlaying,
		isFirstTransition,
		shouldRenderSlides,
		showDefaultBackground,
		isDefaultBackgroundLeaving,
		play,
		pause,
	};
};
