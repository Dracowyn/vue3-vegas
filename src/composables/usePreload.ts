import { ref, onUnmounted } from 'vue';
import type { SlideProps, Logger } from '../types';
import { resolveSlideVideo } from '../utils/videoSource';

export interface UsePreloadOptions {
	getSlides: () => SlideProps[];
	getPreloadImage: () => boolean;
	getPreloadVideo: () => boolean;
	getPreloadImageBatch: () => number;
	log: () => Logger;
	logWarn: () => Logger;
	logError: () => Logger;
}

export const usePreload = (options: UsePreloadOptions) => {
	const {
		getSlides,
		getPreloadImage,
		getPreloadVideo,
		getPreloadImageBatch,
		log,
		logWarn,
		logError,
	} = options;

	const loading = ref(false);
	const loadProgress = ref(0);
	// 预加载用的游离 <video>，必须一直持有引用：丢掉引用就可能被 GC 掉，下载随之中断
	const preloadVideos: HTMLVideoElement[] = [];

	/** 清空源并重跑资源选择算法，让浏览器中断还没下完的下载，再断开引用 */
	const releasePreloadVideos = () => {
		preloadVideos.forEach(video => {
			video.replaceChildren();
			video.load();
		});
		preloadVideos.length = 0;
	};

	onUnmounted(releasePreloadVideos);

	const batchPreloadImages = async () => {
		if (!getPreloadImage()) return;

		loadProgress.value = 0;
		const batchSize = getPreloadImageBatch();
		const slides = getSlides();
		// 空源视频按图片幻灯片渲染（见 utils/videoSource.ts），也要走图片预加载
		const imageSlides = slides.filter(slide => !resolveSlideVideo(slide.video));

		if (imageSlides.length === 0) {
			loadProgress.value = 100;
			return;
		}

		try {
			for (let i = 0; i < imageSlides.length; i += batchSize) {
				const batch = imageSlides.slice(i, i + batchSize);
				const promises = batch.map(slide => {
					return new Promise<void>((resolve) => {
						const img = new Image();
						img.onload = () => resolve();
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
		}
	};

	/**
	 * 视频预加载：给每张视频幻灯片建一个**不挂进文档**的 `<video preload="auto">`，把资源灌进
	 * HTTP 缓存，等真正的 `<video>` 挂载时同一批 URL 直接命中。这也是原版 Vegas.js `_video()`
	 * 的做法。
	 *
	 * 不用 `<link rel="preload" as="video">`：`as="video"` 不是受支持的 preload 目标，
	 * Chrome / Safari 会连同整条 link 一起忽略（MDN 的合法 `as` 值里也已经没有 `video`），
	 * 那样写等于什么都没做。
	 *
	 * 与图片预加载不同，这里不等下载完成——`preload` 主开关只卡图片，视频在后台边下边缓存，
	 * 这一点也与原版一致。
	 */
	const preloadVideoResources = () => {
		if (!getPreloadVideo()) return;

		log()('开始预加载视频资源');
		releasePreloadVideos();

		getSlides().forEach(slide => {
			// 数组简写与完整形式都要归一化后再取 src（见 utils/videoSource.ts）
			const video = resolveSlideVideo(slide.video);
			if (!video) return;

			const preloader = document.createElement('video');
			preloader.preload = 'auto';

			video.src.forEach(src => {
				const source = document.createElement('source');
				source.src = src;
				preloader.appendChild(source);
				log()(`预加载视频: ${src}`);
			});

			// 源挂齐之后再显式 load()：隐式触发的资源选择算法时机依赖插入顺序，显式调用更确定
			preloader.load();
			preloadVideos.push(preloader);
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
		preloadResources,
	};
};
