<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed } from 'vue';
import type { VegasProps, VegasHandle } from './types';
import VegasDefaultBackground from './components/VegasDefaultBackground.vue';
import VegasLoader from './components/VegasLoader.vue';
import VegasOverlay from './components/VegasOverlay.vue';
import VegasTimer from './components/VegasTimer.vue';
import VegasSlideRenderer from './components/VegasSlideRenderer.vue';
import { useLogger } from './composables/useLogger';
import { usePreload } from './composables/usePreload';
import { useAnimationVariants } from './composables/useAnimationVariants';
import { useVegasState } from './composables/useVegasState';
import { useVegasLifecycle } from './composables/useVegasLifecycle';
import { useAutoplay } from './composables/useAutoplay';
import { useVisibilityChange } from './composables/useVisibilityChange';

const props = withDefaults(defineProps<VegasProps>(), {
	slide: 0,
	delay: 5000,
	loop: true,
	preload: false,
	preloadImage: false,
	preloadImageBatch: undefined,
	preLoadImageBatch: undefined,
	preloadVideo: false,
	showLoading: false,
	timer: false,
	overlay: false,
	autoplay: true,
	shuffle: false,
	cover: true,
	color: null,
	align: 'center',
	valign: 'center',
	firstTransition: null,
	firstTransitionDuration: 3000,
	transition: 'fade',
	transitionDuration: 1000,
	defaultBackground: undefined,
	defaultBackgroundDuration: 3000,
	loadingText: undefined,
	overlayColor: undefined,
	debug: false,
	onInit: undefined,
	onPlay: undefined,
	onPause: undefined,
	onWalk: undefined,
});

const isTransitioning = ref(false);

const effectivePreloadImageBatch = computed(() => props.preloadImageBatch ?? props.preLoadImageBatch ?? 3);

const { log, logWarn, logError } = useLogger(() => props.debug);

const { loading, loadProgress, loadedImages, preloadResources } = usePreload(
	() => props.slides,
	() => props.preloadImage,
	() => props.preloadVideo,
	() => effectivePreloadImageBatch.value,
	() => log.value,
	() => logWarn.value,
	() => logError.value
);

const { variants } = useAnimationVariants(() => props.transitionDuration);

const {
	phase,
	isPlaying,
	isFirstTransition,
	shouldRenderSlides,
	showDefaultBackground,
	isDefaultBackgroundLeaving,
	play: startPlayback,
	pause: stopPlayback,
} = useVegasLifecycle(
	() => props.preload,
	() => props.autoplay,
	() => Boolean(props.defaultBackground),
	() => props.defaultBackgroundDuration,
	() => props.firstTransitionDuration,
	preloadResources,
	() => log.value
);

const vegasState = useVegasState(
	() => props.slide,
	() => props.slides,
	() => props.loop,
	() => props.shuffle,
	() => isTransitioning.value,
	() => log.value,
	props.onWalk,
	stopPlayback
);

const {
	currentSlide,
	currentOrderIndex,
	visibleSlides,
	next: stateNext,
	previous: statePrevious,
} = vegasState;

const startTransition = (transitionStarted: boolean) => {
	if (transitionStarted) {
		isTransitioning.value = true;
	}
	return transitionStarted;
};

const next = () => startTransition(stateNext());
const previous = () => startTransition(statePrevious());

const play = () => {
	log.value('开始播放幻灯片');
	startPlayback();
};

const pause = () => {
	log.value('暂停播放幻灯片');
	stopPlayback();
};

useAutoplay(
	isPlaying,
	() => isTransitioning.value,
	() => currentSlide.value,
	() => props.slides,
	() => props.delay,
	next,
	() => log.value
);

useVisibilityChange(isPlaying, play, pause, () => log.value);

// Compute slide transition info (stored as data attrs for TransitionGroup hooks)
const getSlideTransitionName = (idx: number) => {
	const slide = props.slides[idx];
	if (isFirstTransition() && props.firstTransition) return props.firstTransition;
	return slide?.transition || props.transition;
};

const getSlideTransitionDuration = (idx: number) => {
	const slide = props.slides[idx];
	if (isFirstTransition()) return props.firstTransitionDuration;
	return slide?.transitionDuration || props.transitionDuration;
};

const handleSlideEnter = (el: Element, done: () => void) => {
	const htmlEl = el as HTMLElement;
	const transName = htmlEl.dataset.transitionName || 'fade';
	const duration = Number(htmlEl.dataset.transitionDuration) || props.transitionDuration;
	const variant = variants[transName] || variants.fade;
	variant({ duration: duration / 1000 }).onEnter(el, done);
};

const handleSlideLeave = (el: Element, done: () => void) => {
	const htmlEl = el as HTMLElement;
	const transName = htmlEl.dataset.transitionName || 'fade';
	const variant = variants[transName] || variants.fade;
	// Leave always uses base transitionDuration (matching React AnimatePresence behavior)
	variant({ duration: props.transitionDuration / 1000 }).onLeave(el, done);
};

// Track phase changes for onPlay/onPause callbacks
let previousPhase: string | null = null;
watch(phase, (newPhase) => {
	if (previousPhase !== newPhase) {
		if (newPhase === 'playing') {
			props.onPlay?.();
		}
		if (newPhase === 'paused' && previousPhase === 'playing') {
			props.onPause?.();
		}
		previousPhase = newPhase;
	}
});

// Handle transitioning state cleanup
let transitionTimer: ReturnType<typeof setTimeout> | null = null;

watch(isTransitioning, (val) => {
	if (transitionTimer !== null) {
		clearTimeout(transitionTimer);
		transitionTimer = null;
	}
	if (val) {
		transitionTimer = setTimeout(() => {
			transitionTimer = null;
			isTransitioning.value = false;
			log.value('幻灯片切换动画完成');
		}, props.transitionDuration);
	}
});

onMounted(() => {
	log.value('Vegas组件开始初始化');
	props.onInit?.();
});

onUnmounted(() => {
	if (transitionTimer !== null) {
		clearTimeout(transitionTimer);
	}
	log.value('Vegas组件卸载');
});

// Expose handle
defineExpose<VegasHandle>({
	previous,
	next,
	play,
	pause,
});
</script>

<template>
	<div
		v-if="slides.length > 0"
		:style="{
			position: 'relative',
			width: '100%',
			height: '100%',
			overflow: 'hidden',
			backgroundColor: color || undefined,
		}"
	>
		<!-- 默认背景图层 -->
		<VegasDefaultBackground
			v-if="defaultBackground && showDefaultBackground()"
			:background-url="defaultBackground"
			:leaving="isDefaultBackgroundLeaving()"
			:transition-duration="firstTransitionDuration"
		/>

		<!-- 幻灯片 -->
		<TransitionGroup
			v-if="shouldRenderSlides()"
			:css="false"
			appear
			@enter="handleSlideEnter"
			@leave="handleSlideLeave"
		>
			<VegasSlideRenderer
				v-for="idx in visibleSlides"
				:key="slides[idx]?.src ?? idx"
				:data-slide-index="String(idx)"
				:data-transition-name="getSlideTransitionName(idx)"
				:data-transition-duration="String(getSlideTransitionDuration(idx))"
				:slide="slides[idx]"
				:index="idx"
				:cover="cover"
				:align="align"
				:valign="valign"
				:color="color"
				:preload-image="preloadImage"
				:loaded-images="loadedImages"
				:is-media-playing="phase !== 'paused'"
				:can-advance="phase === 'playing'"
				:next="next"
				:log="log"
				:log-warn="logWarn"
				:log-error="logError"
			/>
		</TransitionGroup>

		<!-- 遮罩层 -->
		<VegasOverlay
			v-if="overlay"
			:overlay-color="overlayColor"
		/>

		<!-- 进度条 -->
		<VegasTimer
			v-if="timer && shouldRenderSlides()"
			:current-order-index="currentOrderIndex"
			:total-slides="slides.length"
		/>

		<!-- 加载指示器 -->
		<VegasLoader
			v-if="showLoading && loading"
			:load-progress="loadProgress"
			:loading-text="loadingText"
		/>
	</div>
</template>
