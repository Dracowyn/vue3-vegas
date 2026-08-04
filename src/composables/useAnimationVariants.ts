import { TRANSITION_PRESETS } from './transitionPresets';
import { VEGAS_LAYERS } from '../constants/layers';

export interface VegasTransitionHandlers {
	onEnter: (el: Element, done: () => void) => void;
	onLeave: (el: Element, done: () => void) => void;
}

export const useAnimationVariants = (getTransitionDuration: () => number) => {
	const applyStyles = (el: Element, styles: Record<string, string>) => {
		Object.assign((el as HTMLElement).style, styles);
	};

	// 强制回流，让浏览器先记住初始样式再应用目标样式。
	// 比单次 requestAnimationFrame 更可靠，尤其在 Nuxt/SSR hydration 期间。
	const forceReflow = (el: Element) => {
		void (el as HTMLElement).offsetHeight;
	};

	// 只为预设里真正出现的属性生成 transition 简写，避免波及 z-index 等辅助属性
	const buildTransitionShorthand = (styles: Record<string, string>, durationMs: number) =>
		Object.keys(styles).map(property => `${property} ${durationMs}ms`).join(', ');

	const getHandlers = (name: string, enterDurationMs: number): VegasTransitionHandlers => {
		const preset = TRANSITION_PRESETS[name] ?? TRANSITION_PRESETS.fade;

		return {
			onEnter: (el, done) => {
				// 进入的幻灯片必须盖在离场的那张之上，不依赖 DOM 顺序的隐式层叠。
				// 该值动画结束后仍然保留，遮罩/进度条靠更高的 z-index 压住它（见 constants/layers.ts）。
				applyStyles(el, { ...preset.from, zIndex: String(VEGAS_LAYERS.slideEntering) });
				forceReflow(el);
				applyStyles(el, {
					...preset.to,
					transition: buildTransitionShorthand(preset.to, enterDurationMs),
				});
				setTimeout(done, enterDurationMs);
			},
			onLeave: (el, done) => {
				// 离场固定用基础时长
				const leaveDurationMs = getTransitionDuration();
				applyStyles(el, { zIndex: String(VEGAS_LAYERS.slideLeaving) });

				// 无 out 的预设（原版 `X` 变体）：旧图保持不动，仅等待被移除
				if (preset.out) {
					applyStyles(el, {
						...preset.out,
						transition: buildTransitionShorthand(preset.out, leaveDurationMs),
					});
				}

				setTimeout(done, leaveDurationMs);
			},
		};
	};

	return { getHandlers };
};
