<script setup lang="ts">
import { sanitizeCssUrl } from '../utils/sanitizeUrl';

defineProps<{
	backgroundUrl: string;
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
			opacity: 1,
		}"
	/>
</template>
