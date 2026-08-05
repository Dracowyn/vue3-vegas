import { TRANSITION_PRESETS } from './transitionPresets';
import { VEGAS_LAYERS } from '../constants/layers';

export interface VegasTransitionHandlers {
	onEnter: (el: Element, done: () => void) => void;
	onLeave: (el: Element, done: () => void) => void;
}

export const useAnimationVariants = () => {
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

	// 原版语义：进入与离开共用「目标幻灯片」解析出的同一个时长（durationMs），
	// 不区分「进入用目标时长、离开用基础时长」。
	const getHandlers = (name: string, durationMs: number): VegasTransitionHandlers => {
		const preset = TRANSITION_PRESETS[name] ?? TRANSITION_PRESETS.fade;

		return {
			onEnter: (el, done) => {
				// 进入的幻灯片必须盖在离场的那张之上，不依赖 DOM 顺序的隐式层叠。
				// 该值动画结束后仍然保留，遮罩/进度条靠更高的 z-index 压住它（见 constants/layers.ts）。
				applyStyles(el, { ...preset.from, zIndex: String(VEGAS_LAYERS.slideEntering) });
				forceReflow(el);
				applyStyles(el, {
					...preset.to,
					transition: buildTransitionShorthand(preset.to, durationMs),
				});
				setTimeout(done, durationMs);
			},
			onLeave: (el, done) => {
				applyStyles(el, { zIndex: String(VEGAS_LAYERS.slideLeaving) });

				// 无 out 的预设（原版 `X` 变体）：旧图保持不动，仅等待被移除
				if (preset.out) {
					applyStyles(el, {
						...preset.out,
						transition: buildTransitionShorthand(preset.out, durationMs),
					});
				}

				setTimeout(done, durationMs);
			},
		};
	};

	return { getHandlers };
};
