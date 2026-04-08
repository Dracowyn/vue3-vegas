<script setup lang="ts">
withDefaults(defineProps<{
	overlayColor?: string;
}>(), {
	overlayColor: 'rgba(0,0,0,0.3)',
});
</script>

<template>
	<div
		:style="{
			position: 'absolute',
			top: 0,
			left: 0,
			width: '100%',
			height: '100%',
			background: overlayColor,
		}"
	/>
</template>
