import { ref, onUnmounted } from 'vue';
import type { SlideProps, Logger } from '../types';

export const usePreload = (
	getSlides: () => SlideProps[],
	getPreloadImage: () => boolean,
	getPreloadVideo: () => boolean,
	getPreloadImageBatch: () => number,
	log: () => Logger,
	logWarn: () => Logger,
	logError: () => Logger
) => {
	const loading = ref(false);
	const loadProgress = ref(0);
	const loadedImages = ref<Record<string, boolean>>({});
	const preloadLinks: HTMLLinkElement[] = [];

	onUnmounted(() => {
		preloadLinks.forEach(link => link.remove());
		preloadLinks.length = 0;
	});

	const batchPreloadImages = async () => {
		if (!getPreloadImage()) return;

		loading.value = true;
		loadProgress.value = 0;
		const batchSize = getPreloadImageBatch();
		const slides = getSlides();
		const imageSlides = slides.filter(slide => !slide.video);

		if (imageSlides.length === 0) {
			loadProgress.value = 100;
			loading.value = false;
			return;
		}

		try {
			for (let i = 0; i < imageSlides.length; i += batchSize) {
				const batch = imageSlides.slice(i, i + batchSize);
				const promises = batch.map(slide => {
					return new Promise<void>((resolve) => {
						const img = new Image();
						img.onload = () => {
							loadedImages.value = { ...loadedImages.value, [slide.src]: true };
							resolve();
						};
						img.onerror = () => {
							logWarn()(`图片加载失败: ${slide.src}`);
							resolve();
						};
						img.src = slide.src;
					});
				});

				await Promise.all(promises);
				loadProgress.value = Math.min(100, Math.floor(((i + batch.length) / imageSlides.length) * 100));
			}
		} catch (error) {
			logError()('预加载图片时发生错误:', error);
		} finally {
			loading.value = false;
		}
	};

	const preloadVideoResources = () => {
		if (!getPreloadVideo()) return;

		log()('开始预加载视频资源');
		preloadLinks.forEach(link => link.remove());
		preloadLinks.length = 0;

		const slides = getSlides();
		slides.forEach(slide => {
			if (slide.video) {
				slide.video.src.forEach(src => {
					const link = document.createElement('link');
					link.rel = 'preload';
					link.as = 'video';
					link.href = src;
					document.head.appendChild(link);
					preloadLinks.push(link);
					log()(`预加载视频: ${src}`);
				});
			}
		});
	};

	const preloadResources = async () => {
		log()('开始预加载资源');
		loading.value = true;

		const preloadPromises: Promise<void>[] = [];

		if (getPreloadImage()) {
			preloadPromises.push(batchPreloadImages());
		}

		if (getPreloadVideo()) {
			preloadVideoResources();
		}

		try {
			await Promise.all(preloadPromises);
			log()('所有资源预加载完成');
		} catch (error) {
			logError()('预加载资源时发生错误:', error);
		} finally {
			loading.value = false;
		}
	};

	return {
		loading,
		loadProgress,
		loadedImages,
		preloadResources,
	};
};
