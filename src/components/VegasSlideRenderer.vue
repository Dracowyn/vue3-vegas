<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import type { CSSProperties } from 'vue';
import type { SlideProps, Logger } from '../types';
import {
	CUSTOM_ANIMATION_CLASS_PREFIX,
	KEN_BURNS_ANIMATION_PREFIX,
	KEN_BURNS_NAMES,
} from '../composables/kenBurnsPresets';
import { resolveSlideVideo } from '../utils/videoSource';
import { fadeInVideoSound, type CancelFade } from '../utils/videoSound';

const props = defineProps<{
	slide: SlideProps;
	index: number;
	cover: boolean;
	align: string;
	valign: string;
	color: string | null;
	animationName: string | null;
	animationDuration: number;
	/** 本次过渡的时长（ms），视频音量淡入用它对齐画面的过渡节奏 */
	transitionDuration: number;
	isMediaPlaying: boolean;
	canAdvance: boolean;
	/** 视频完整播一遍后切到下一张（slide.delay 为 'video' 且有下一张可切） */
	advanceOnEnded: boolean;
	/**
	 * 读取当前幻灯片下标。切换时上一张还要挂载一个过渡时长做离场动画，离场中的视频播完或出错
	 * 不能再调 next()，否则会连跳一张。必须传函数而不是布尔 prop：离场节点已经移出
	 * TransitionGroup 的列表，Vue 不会再给它更新 props，布尔值会一直停在「是当前」
	 */
	getCurrentSlide: () => number;
	next: () => void;
	log: Logger;
	logWarn: Logger;
	logError: Logger;
}>();

const videoRef = ref<HTMLVideoElement | null>(null);

const mediaFit = computed(() => (props.slide.cover ?? props.cover) ? 'cover' : 'contain');
const mediaPosition = computed(() => `${props.slide.align || props.align} ${props.slide.valign || props.valign}`);

// 数组简写 `video: ['a.mp4']` 与完整形式 `{ src, muted, loop }` 在这里统一成一种形状。
// 原版 Vegas.js 视频默认 muted/loop 均为 true：不静音会被浏览器自动播放策略拦截。
const resolvedVideo = computed(() => resolveSlideVideo(props.slide.video));
const videoSources = computed(() => resolvedVideo.value?.src ?? []);
const videoMuted = computed(() => resolvedVideo.value?.muted ?? true);
const videoLoop = computed(() => resolvedVideo.value?.loop ?? true);
// 播完再切时必须关掉 loop，否则 ended 永远不会触发
const effectiveLoop = computed(() => !props.advanceOnEnded && videoLoop.value);

const surfaceStyle = computed<CSSProperties>(() => ({
	position: 'absolute',
	top: '0',
	left: '0',
	width: '100%',
	height: '100%',
	backgroundColor: props.slide.color || props.color || undefined,
}));

// 内置 Ken Burns 名字才有对应的 @keyframes，其余（animationRegister 登记过的自定义名）
// 走 CSS 类模式——resolveEffectName 已经保证走到这里的名字要么内置、要么登记过
const isBuiltinKenBurns = computed(() =>
	props.animationName !== null && KEN_BURNS_NAMES.includes(props.animationName)
);

// Ken Burns 挂在内层媒体上,与外层 wrapper 的过渡 transform 互不覆盖。
// 用 forwards 保持结束状态,避免动画短于 delay 时画面回弹。
const animationStyle = computed<CSSProperties>(() => {
	if (!props.animationName) return {};

	if (isBuiltinKenBurns.value) {
		return {
			animation: `${KEN_BURNS_ANIMATION_PREFIX}${props.animationName} `
				+ `${props.animationDuration}ms ease-out forwards`,
		};
	}

	// 自定义动画：keyframes 由使用者的 CSS 提供，这里只设置时长，类名单独绑定
	return { animationDuration: `${props.animationDuration}ms` };
});

// 自定义动画的类名，内置 Ken Burns 走行内 animation 简写，不需要类
const animationClass = computed(() =>
	props.animationName && !isBuiltinKenBurns.value
		? `${CUSTOM_ANIMATION_CLASS_PREFIX}${props.animationName}`
		: undefined
);

const videoStyle = computed<CSSProperties>(() => ({
	...surfaceStyle.value,
	objectFit: mediaFit.value,
	objectPosition: mediaPosition.value,
	...animationStyle.value,
}));

const imgStyle = computed<CSSProperties>(() => ({
	...surfaceStyle.value,
	objectFit: mediaFit.value,
	objectPosition: mediaPosition.value,
	...animationStyle.value,
}));

const syncVideoPlayback = (playing: boolean) => {
	if (!resolvedVideo.value || !videoRef.value) return;

	if (!playing) {
		videoRef.value.pause();
		return;
	}

	const playPromise = videoRef.value.play();
	if (playPromise) {
		playPromise.catch(error => {
			props.logWarn(`视频播放被浏览器阻止: ${props.slide.src}`, error);
		});
	}
};

// 不静音视频的音量淡入（原版 `_fadeInSound`）。离场侧的淡出由 Vegas.vue 的离场钩子负责：
// 离场节点已脱离 TransitionGroup 的列表，这里收不到它的 props 更新
let cancelSoundFade: CancelFade | null = null;
let soundFadeStarted = false;

/**
 * 起播的同一时刻才开始淡入，而不是挂载时就开始。
 * 暂停状态下也能通过 next() / goTo() 切幻灯片，这时视频并没有真的播；若挂载即淡入，
 * 音量会在无声中被推满，等使用者按下播放时就是满音量硬切，淡入等于白做。
 * 只淡一次：暂停再恢复不重来（原版也只在 `_goto` 时淡入一次）。
 */
const startSoundFadeIn = () => {
	if (soundFadeStarted || !videoRef.value || videoMuted.value) return;
	soundFadeStarted = true;
	cancelSoundFade = fadeInVideoSound(videoRef.value, props.transitionDuration);
};

watch(() => props.isMediaPlaying, playing => {
	syncVideoPlayback(playing);
	if (playing) startSoundFadeIn();
});

// 挂载时就处于播放状态也要主动 play()：autoplay 属性要等浏览器判断能流畅播完
// （readyState 4）才起播，大码率视频在慢网络下会一直停在封面；play() 在有数据时就开始边下边播
onMounted(() => {
	// 配了 video 却一个源都没有：resolveSlideVideo 已经把它判为非视频，这里按图片渲染。
	// 静默降级容易让人以为是视频加载失败，debug 打开时明确说一声
	if (props.slide.video && !resolvedVideo.value) {
		props.logWarn(`视频未配置任何源，已按图片幻灯片处理: ${props.slide.src}`);
	}

	// 先把音量压到 0：淡入可能要等到恢复播放才开始，在那之前绝不能漏出满音量
	if (videoRef.value && !videoMuted.value) videoRef.value.volume = 0;

	if (props.isMediaPlaying) {
		syncVideoPlayback(true);
		startSoundFadeIn();
	}
});

// 这行取消是承重的，不是顺手清理：幻灯片离场时本组件会立刻卸载（只有 DOM 节点留下来跑完
// 离场动画），此时进入侧的淡入若还在跑，就会和 Vegas.vue 发起的淡出交替写同一个 volume，
// 音量来回横跳。tests/videoSound.test.ts 的「淡变链互斥」用例钉住了这个行为
onUnmounted(() => {
	cancelSoundFade?.();
	cancelSoundFade = null;
});

// 视频播完（或所有源都加载失败）后是否该切走
const shouldAdvanceAfterVideo = () => props.advanceOnEnded || !videoLoop.value;

// 播完时可能还不能切（例如短视频在首帧过渡期间就播完了），记下来等 canAdvance 变 true 再切
let pendingAdvance = false;

const advanceAfterVideo = (reason: string) => {
	if (props.getCurrentSlide() !== props.index || !shouldAdvanceAfterVideo()) {
		pendingAdvance = false;
		return;
	}
	if (!props.canAdvance) {
		pendingAdvance = true;
		return;
	}
	pendingAdvance = false;
	props.log(`${reason},切换到下一张`);
	props.next();
};

watch(() => props.canAdvance, (canAdvance) => {
	if (canAdvance && pendingAdvance) advanceAfterVideo('视频已提前结束');
});

const handleVideoEnded = () => {
	advanceAfterVideo('视频播放结束');
};

// <video> 用 <source> 子元素时，加载失败的 error 事件派发在各个 <source> 上而不是 <video> 上，
// 最后一个源也失败才说明整段视频放不出来
const handleSourceError = (index: number) => {
	if (index !== videoSources.value.length - 1) return;
	props.logError(`视频所有源都加载失败: ${props.slide.src}`);
	if (props.advanceOnEnded) advanceAfterVideo('视频无法播放');
};

// 源已经选中之后的致命错误（解码失败、网络彻底中断）派发在 <video> 本身上
const handleVideoError = () => {
	const code = videoRef.value?.error?.code;
	props.logError(`视频播放出错${code ? `（MediaError ${code}）` : ''}: ${props.slide.src}`);
	if (props.advanceOnEnded) advanceAfterVideo('视频播放出错');
};

const handleImgError = () => {
	props.logError(`图片加载失败: ${props.slide.src}`);
};
</script>

<template>
	<div
		:style="{
			position: 'absolute',
			width: '100%',
			height: '100%',
		}"
	>
		<template v-if="resolvedVideo">
			<video
				ref="videoRef"
				:class="animationClass"
				:style="videoStyle"
				:autoplay="isMediaPlaying"
				:muted="videoMuted"
				:loop="effectiveLoop"
				playsinline
				preload="auto"
				:poster="slide.src || undefined"
				@ended="handleVideoEnded"
				@error="handleVideoError"
			>
				<source
					v-for="(src, i) in videoSources"
					:key="i"
					:src="src"
					@error="handleSourceError(i)"
				/>
			</video>
		</template>
		<template v-else>
			<img
				:src="slide.src"
				alt=""
				:class="animationClass"
				:style="imgStyle"
				aria-hidden="true"
				@error="handleImgError"
			/>
		</template>
	</div>
</template>
