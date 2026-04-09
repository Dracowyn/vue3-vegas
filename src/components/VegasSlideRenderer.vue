<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { CSSProperties } from 'vue';
import type { SlideProps, Logger } from '../types';

const props = defineProps<{
	slide: SlideProps;
	index: number;
	cover: boolean;
	align: string;
	valign: string;
	color: string | null;
	preloadImage: boolean;
	loadedImages: Record<string, boolean>;
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

const surfaceStyle = computed<CSSProperties>(() => ({
	position: 'absolute',
	top: '0',
	left: '0',
	width: '100%',
	height: '100%',
	backgroundColor: props.slide.color || props.color || undefined,
}));

const videoStyle = computed<CSSProperties>(() => ({
	...surfaceStyle.value,
	objectFit: mediaFit.value,
	objectPosition: mediaPosition.value,
}));

const imgStyle = computed<CSSProperties>(() => ({
	...surfaceStyle.value,
	objectFit: mediaFit.value,
	objectPosition: mediaPosition.value,
}));

const isImagePreloaded = computed(() =>
	props.preloadImage && props.loadedImages[props.slide.src]
);

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
	if (!props.slide.video?.loop && props.canAdvance) {
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
				:style="videoStyle"
				:autoplay="isMediaPlaying"
				:muted="slide.video.muted"
				:loop="slide.video.loop"
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
				:style="imgStyle"
				:aria-hidden="!isImagePreloaded"
				@error="handleImgError"
			/>
		</template>
	</div>
</template>
