<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { CSSProperties } from 'vue';
import type { SlideProps, Logger } from '../types';
import {
	CUSTOM_ANIMATION_CLASS_PREFIX,
	KEN_BURNS_ANIMATION_PREFIX,
	KEN_BURNS_NAMES,
} from '../composables/kenBurnsPresets';

const props = defineProps<{
	slide: SlideProps;
	index: number;
	cover: boolean;
	align: string;
	valign: string;
	color: string | null;
	animationName: string | null;
	animationDuration: number;
	isMediaPlaying: boolean;
	canAdvance: boolean;
	next: () => void;
	log: Logger;
	logWarn: Logger;
	logError: Logger;
}>();

const videoRef = ref<HTMLVideoElement | null>(null);

const mediaFit = computed(() => (props.slide.cover ?? props.cover) ? 'cover' : 'contain');
const mediaPosition = computed(() => `${props.slide.align || props.align} ${props.slide.valign || props.valign}`);

// 原版 Vegas.js 视频默认 muted/loop 均为 true：不静音会被浏览器自动播放策略拦截。
const videoMuted = computed(() => props.slide.video?.muted ?? true);
const videoLoop = computed(() => props.slide.video?.loop ?? true);

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

// Control video play/pause
watch(() => props.isMediaPlaying, (playing) => {
	if (!props.slide.video || !videoRef.value) return;

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
});

const handleVideoEnded = () => {
	if (!videoLoop.value && props.canAdvance) {
		props.log('视频播放结束,切换到下一张');
		props.next();
	}
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
		<template v-if="slide.video">
			<video
				ref="videoRef"
				:class="animationClass"
				:style="videoStyle"
				:autoplay="isMediaPlaying"
				:muted="videoMuted"
				:loop="videoLoop"
				playsinline
				preload="auto"
				:poster="slide.src || undefined"
				@ended="handleVideoEnded"
			>
				<source
					v-for="(src, i) in slide.video.src"
					:key="i"
					:src="src"
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
