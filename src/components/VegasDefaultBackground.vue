<script setup lang="ts">
import { sanitizeCssUrl } from '../utils/sanitizeUrl';

defineProps<{
	backgroundUrl: string;
	leaving?: boolean;
	transitionDuration?: number;
}>();
</script>

<template>
	<div
		:style="{
			position: 'absolute',
			top: 0,
			left: 0,
			width: '100%',
			height: '100%',
			backgroundImage: sanitizeCssUrl(backgroundUrl),
			backgroundSize: 'cover',
			backgroundPosition: 'center',
			zIndex: 0,
			opacity: leaving ? 0 : 1,
			transition: leaving ? `opacity ${(transitionDuration || 1000) / 1000}s ease` : undefined,
		}"
	/>
</template>
