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
import { injectKeyframes, injectRootStyles } from './utils/injectKeyframes';
import { VEGAS_ROOT_CLASS, VEGAS_ROOT_VARIABLES_CSS } from './constants/rootStyles';
import { KEN_BURNS_KEYFRAMES_CSS, KEN_BURNS_NAMES } from './composables/kenBurnsPresets';
import { TRANSITION_NAMES } from './composables/transitionPresets';
import { resolveEffectDuration, resolveEffectName } from './utils/resolveEffect';

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
	animation: null,
	animationDuration: 'auto',
	transitionRegister: undefined,
	animationRegister: undefined,
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

// `preload` 是主开关,等价于同时开启图片与视频预加载(与原版 Vegas.js 语义一致);
// `preloadImage` / `preloadVideo` 也可单独开启各自的预加载。
const effectivePreloadImage = computed(() => props.preload || props.preloadImage);
const effectivePreloadVideo = computed(() => props.preload || props.preloadVideo);
const shouldPreload = computed(() => effectivePreloadImage.value || effectivePreloadVideo.value);

const { log, logWarn, logError } = useLogger(() => props.debug);

const { loading, loadProgress, preloadResources } = usePreload(
	() => props.slides,
	() => effectivePreloadImage.value,
	() => effectivePreloadVideo.value,
	() => effectivePreloadImageBatch.value,
	() => log.value,
	() => logWarn.value,
	() => logError.value
);

const { getHandlers } = useAnimationVariants(() => props.transitionDuration);

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
	() => shouldPreload.value,
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

// 锁需保持到本次切换的进入动画结束。进入动画用的是目标幻灯片的有效时长,
// 离开动画固定用基础时长,取两者较大值,避免短锁导致动画重叠。
const currentTransitionDuration = ref(props.transitionDuration);

const startTransition = (transitionStarted: boolean) => {
	if (transitionStarted) {
		const enterDuration = getSlideTransitionDuration(currentSlide.value);
		currentTransitionDuration.value = Math.max(enterDuration, props.transitionDuration);
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
	const requested = (isFirstTransition() && props.firstTransition)
		? props.firstTransition
		: (slide?.transition || props.transition);

	// fallback 传的是非空的 'fade'，因此结果一定是 string
	return resolveEffectName(
		requested,
		props.transitionRegister,
		TRANSITION_NAMES,
		'fade',
		name => logWarn.value(`未知的过渡效果「${name}」，回退到 fade`)
	) as string;
};

const getSlideTransitionDuration = (idx: number) => {
	const slide = props.slides[idx];
	if (isFirstTransition()) return props.firstTransitionDuration;
	return slide?.transitionDuration || props.transitionDuration;
};

// 该张幻灯片的有效停留时长，也是 animationDuration: 'auto' 的取值来源
const getSlideDelay = (idx: number) => props.slides[idx]?.delay ?? props.delay;

// 该张幻灯片请求的动画名（可能是 `'random'`，此时还未抽取）
const getRequestedAnimation = (idx: number) => props.slides[idx]?.animation ?? props.animation;

const getSlideAnimationName = (idx: number) => {
	return resolveEffectName(
		getRequestedAnimation(idx),
		props.animationRegister,
		KEN_BURNS_NAMES,
		null,
		name => logWarn.value(`未知的动画效果「${name}」，已忽略`)
	);
};

const getSlideAnimationDuration = (idx: number) => {
	const slide = props.slides[idx];
	return resolveEffectDuration(
		slide?.animationDuration ?? props.animationDuration,
		getSlideDelay(idx),
		getSlideDelay(idx)
	);
};

// 本次切换使用的过渡名。原版语义：进入与离开共用「目标幻灯片」的过渡，
// 因此离场钩子不能从离场元素上读 data 属性（那是上一张的过渡名）。
const currentTransitionName = ref(props.transition);

// 本次幻灯片使用的 Ken Burns 动画名。与过渡名同理，用 ref 缓存，
// 避免 `'random'` 在每次渲染时重新抽取导致画面抖动。
const currentAnimationName = ref<string | null>(null);

// 动画名的「解析依据」指纹：幻灯片下标 + 请求的动画名 + random 候选池。
// 指纹没变就说明没有任何需要重解析的输入变化，直接沿用已解析的结果；
// 同时它本身就是响应式来源——读它即可追踪到 animation / animationRegister /
// slides[i].animation 的任何变化。
const animationKey = computed(() =>
	`${currentSlide.value}`
	+ `|${getRequestedAnimation(currentSlide.value) ?? ''}`
	+ `|${(props.animationRegister ?? []).join(',')}`
);

// 记录动画名上次是按哪份指纹解析的，null 表示尚未解析过
let resolvedAnimationKey: string | null = null;

// 两行的重算规则不同，原因如下：
// - 过渡名依赖 phase（`isFirstTransition()` 决定是否用 firstTransition），必须跟着 phase 重算；
//   它只在钩子触发的那一刻被读取，中途重抽不会影响已经在播的动画，因此重算是安全的。
// - 动画名不依赖 phase，且它是绑定到媒体元素上的实时样式；phase 在
//   firstSlide | playing | paused 之间变化时幻灯片始终挂载，若跟着重算，
//   `'random'` 会抽到新名字并让 Ken Burns 从 0% 帧重新开始（暂停/切标签页时同样会触发）。
//   所以只在指纹变化（换幻灯片，或 animation / animationRegister / 该张自己的 animation
//   真的改了）时才重新解析——phase 变化不在指纹里，不会触发重抽。
watch(
	[currentSlide, phase, animationKey],
	() => {
		currentTransitionName.value = getSlideTransitionName(currentSlide.value);

		if (resolvedAnimationKey !== animationKey.value) {
			resolvedAnimationKey = animationKey.value;
			currentAnimationName.value = getSlideAnimationName(currentSlide.value);
		}
	},
	{ immediate: true }
);

const handleSlideEnter = (el: Element, done: () => void) => {
	const htmlEl = el as HTMLElement;
	const transName = htmlEl.dataset.transitionName || 'fade';
	const duration = Number(htmlEl.dataset.transitionDuration) || props.transitionDuration;
	getHandlers(transName, duration).onEnter(el, done);
};

const handleSlideLeave = (el: Element, done: () => void) => {
	// 用目标幻灯片的过渡名，而不是离场元素上残留的上一张的名字
	getHandlers(currentTransitionName.value, props.transitionDuration).onLeave(el, done);
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
		}, currentTransitionDuration.value);
	}
});

onMounted(() => {
	log.value('Vegas组件开始初始化');
	// 两份样式都依赖 document，只能在挂载后注入（SSR / Nuxt 水合安全）。
	// 幻灯片要到 phase 变成 firstSlide 才渲染，而 phase 的推进发生在
	// useVegasLifecycle 的 onMounted 里，且 DOM 更新会排到本轮所有 onMounted
	// 之后的微任务，因此消费这些变量的元素一定晚于注入出现。
	injectRootStyles(VEGAS_ROOT_VARIABLES_CSS);
	injectKeyframes(KEN_BURNS_KEYFRAMES_CSS);
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
		:class="VEGAS_ROOT_CLASS"
		:style="{
			position: 'relative',
			width: '100%',
			height: '100%',
			overflow: 'hidden',
			backgroundColor: color || undefined,
			isolation: 'isolate',
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
				:key="`${slides[idx]?.src ?? ''}-${idx}`"
				:data-slide-index="String(idx)"
				:data-transition-name="currentTransitionName"
				:data-transition-duration="String(getSlideTransitionDuration(idx))"
				:slide="slides[idx]"
				:index="idx"
				:cover="cover"
				:align="align"
				:valign="valign"
				:color="color"
				:animation-name="currentAnimationName"
				:animation-duration="getSlideAnimationDuration(idx)"
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
