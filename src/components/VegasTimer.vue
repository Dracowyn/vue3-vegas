<script setup lang="ts">
defineProps<{
	currentOrderIndex: number;
	totalSlides: number;
}>();
</script>

<template>
	<div
		:style="{
			position: 'absolute',
			top: 0,
			left: 0,
			height: '3px',
			background: '#fff',
			width: totalSlides > 1
				? `${(currentOrderIndex / (totalSlides - 1)) * 100}%`
				: '100%',
			transition: 'width 0.5s linear',
		}"
	/>
</template>
