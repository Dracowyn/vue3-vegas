import type { SlideProps } from '../types';
import { resolveSlideVideo } from './videoSource';

/**
 * 图片就绪后「要等的 src 是否已经变了」的复核最多重来几次。
 *
 * 复核是为了不把过期的等待结果套在新内容上（slides 被整体换成等长的新数组）。正常情况下
 * 内容换一次、重来一次就收敛；但 `slides` 完全由使用者控制，`src` 若是一个每次读取都返回
 * 不同值的 getter（例如在 getter 里拼时间戳），复核永远对不上——导航侧会同步递归到栈溢出，
 * 首帧侧会在微任务里空转到饿死整个事件循环。超过上限就按当前内容放行：宁可显示一张没等过
 * 的图片，也不能卡死。
 */
export const MAX_STALE_IMAGE_RETRIES = 3;

/**
 * 判断切换到某张幻灯片前是否需要等它的图片加载完成（对齐原版 Vegas.js `_goto` 的语义），
 * 需要的话返回要等的 src；不需要（视频幻灯片、空 src、或没有这张幻灯片）时返回 `null`，
 * 调用方应立即继续，不必等待。
 *
 * 视频幻灯片走 `resolveSlideVideo` 判断——它已经把「配了 video 但一个源都没有」的情况
 * 按图片处理，这里复用同一个判断，避免「是不是视频幻灯片」在多处各写一份、将来彼此漂移
 * （useVegasState 的导航门槛与 useVegasLifecycle 的首帧门槛共用这一个出口）。
 */
export const getSlideImageWaitSrc = (slide: SlideProps | undefined): string | null => {
	if (!slide) return null;
	if (resolveSlideVideo(slide.video) !== null) return null;

	const src = slide.src ?? '';
	return src === '' ? null : src;
};
