import type { SlideVideo } from '../types';

/** 归一化之后的视频配置：`muted` / `loop` 一定有值，调用方不必再兜默认 */
export interface ResolvedVideo {
	src: string[];
	muted: boolean;
	loop: boolean;
}

/**
 * 归一化 `slide.video`。原版 Vegas.js 里两种写法等价：
 * - `video: ['a.mp4', 'b.webm']`——数组简写，`muted` / `loop` 取默认值 `true`
 * - `video: { src: ['a.mp4'], muted, loop }`——完整形式
 *
 * 非视频幻灯片返回 `null`。**源列表为空也返回 `null`**：一个 `<source>` 都没有的
 * `<video>` 既放不出画面，也永远不会触发 `ended` 或 source 的 `error`，`delay: 'video'`
 * 的幻灯片只能干等到 `videoMaxDelay`（默认 5 分钟）兜底才走得掉。原版会照渲一个这样的
 * 空 `<video>`，这里不照搬，让调用方退回图片渲染。
 */
export const resolveSlideVideo = (video: SlideVideo | null | undefined): ResolvedVideo | null => {
	if (!video) return null;

	const resolved: ResolvedVideo = Array.isArray(video)
		? { src: video, muted: true, loop: true }
		: {
			src: video.src ?? [],
			muted: video.muted ?? true,
			loop: video.loop ?? true,
		};

	return resolved.src.length > 0 ? resolved : null;
};
