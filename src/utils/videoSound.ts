/**
 * 视频音量淡入淡出，对应原版 Vegas.js 的 `_fadeInSound` / `_fadeOutSound`。
 *
 * 不静音的视频进入时音量从 0 淡入、离场时淡出到 0 并暂停，否则两段声音会在过渡期间硬切重叠。
 * 离场时的暂停尤其关键：离场节点已脱离 TransitionGroup 的列表，收不到组件 props 更新，
 * 没人替它调 `pause()`，声音会一直放到元素被移除为止。
 */

/** 取消一次尚未跑完的淡变。已经结束的淡变再调用无副作用 */
export type CancelFade = () => void;

const NO_OP_CANCEL: CancelFade = () => {};

/**
 * 淡变步数。原版按固定 0.09 的步长递归 setTimeout，收尾停在 0.99 而不是 1、
 * 实际耗时也比给定时长多一成（上游小瑕疵），这里改成按步数均分：正好跑满时长、正好到达目标值。
 * 10 步足够平滑，听不出阶梯。
 */
const FADE_STEPS = 10;

/** 浮点累加可能溢出 [0, 1]，而 `video.volume` 越界会抛 IndexSizeError */
const clampVolume = (value: number) => Math.min(1, Math.max(0, value));

/** 在 durationMs 内把音量线性推到 targetVolume，跑完后调用 onComplete */
const fadeVolume = (
	video: HTMLVideoElement,
	targetVolume: number,
	durationMs: number,
	onComplete?: () => void
): CancelFade => {
	const startVolume = video.volume;
	const stepDelay = durationMs / FADE_STEPS;

	// 时长为 0 / 负数 / NaN 时没有淡变的余地，直接落到目标值
	if (!(stepDelay > 0)) {
		video.volume = clampVolume(targetVolume);
		onComplete?.();
		return NO_OP_CANCEL;
	}

	let step = 0;
	let timer: ReturnType<typeof setTimeout> | null = null;

	const tick = () => {
		step += 1;
		video.volume = clampVolume(startVolume + (targetVolume - startVolume) * (step / FADE_STEPS));

		if (step >= FADE_STEPS) {
			timer = null;
			onComplete?.();
			return;
		}

		timer = setTimeout(tick, stepDelay);
	};

	timer = setTimeout(tick, stepDelay);

	return () => {
		if (timer === null) return;
		clearTimeout(timer);
		timer = null;
	};
};

/** 进入的视频：音量从 0 淡入到满，时长与本次过渡一致 */
export const fadeInVideoSound = (video: HTMLVideoElement, durationMs: number): CancelFade => {
	video.volume = 0;
	return fadeVolume(video, 1, durationMs);
};

/**
 * 离场幻灯片里的视频：音量淡出到 0，并在淡出结束时暂停。
 *
 * 收的是幻灯片根元素而不是 `<video>`——离场节点拿不到组件 props，只能像原版那样
 * 从 DOM 里找（原版 `el.querySelector('video')`）。没有视频时静默返回空取消函数。
 */
export const fadeOutSlideVideo = (slideEl: Element, durationMs: number): CancelFade => {
	const video = slideEl.querySelector('video');
	if (!video) return NO_OP_CANCEL;

	return fadeVolume(video, 0, durationMs, () => video.pause());
};
