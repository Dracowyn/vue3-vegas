import { CUSTOM_TRANSITION_CLASS_PREFIX, isVegasTransitionName, TRANSITION_PRESETS } from './transitionPresets';
import { VEGAS_LAYERS } from '../constants/layers';

export interface VegasTransitionHandlers {
	onEnter: (el: Element, done: () => void) => void;
	onLeave: (el: Element, done: () => void) => void;
}

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

// 内置预设的 onEnter 会留下行内 opacity/transform/filter（以及对应的 transition 简写），
// 行内样式优先级永远压过类。混用场景（上一张内置过渡进场、这一张切到自定义过渡离场）下，
// 这些残留必须清掉，否则自定义类里的样式完全不生效。内置 `to` 态是 opacity:1/恒等
// transform/中性 filter，清空这几个属性不会造成视觉跳变。
const clearBuiltinPresetInlineStyles = (el: Element) => {
	applyStyles(el, { opacity: '', transform: '', filter: '' });
};

// 自定义过渡（transitionRegister 登记、没有内置预设）靠 CSS 类生效：组件不知道效果
// 长什么样，只负责在原版约定的时机加/换类名，样式由使用者的 CSS 定义。
const getCustomClassHandlers = (name: string, durationMs: number): VegasTransitionHandlers => {
	const baseClass = `${CUSTOM_TRANSITION_CLASS_PREFIX}${name}`;

	return {
		onEnter: (el, done) => {
			const htmlEl = el as HTMLElement;
			htmlEl.classList.add(baseClass);
			applyStyles(el, { zIndex: String(VEGAS_LAYERS.slideEntering) });
			forceReflow(el);
			htmlEl.style.transition = `all ${durationMs}ms`;
			htmlEl.classList.add(`${baseClass}-in`);
			setTimeout(done, durationMs);
		},
		onLeave: (el, done) => {
			const htmlEl = el as HTMLElement;

			// 原版 _goto 对 outgoing slide 的处理：先把 transition 归零，防止下面的
			// 清理/换类被残留的 transition 动画化
			htmlEl.style.transition = 'all 0ms';
			clearBuiltinPresetInlineStyles(el);

			// 离场元素身上可能还挂着上一次（可能是另一个自定义名）留下的
			// vegas-transition-* 类，同特异性下谁生效取决于样式表顺序——必须先清掉，
			// 再挂本次过渡名的 base + -in（就位态），最后叠加 -out
			Array.from(htmlEl.classList)
				.filter(className => className.startsWith(CUSTOM_TRANSITION_CLASS_PREFIX))
				.forEach(className => htmlEl.classList.remove(className));
			htmlEl.classList.add(baseClass, `${baseClass}-in`);

			applyStyles(el, { zIndex: String(VEGAS_LAYERS.slideLeaving) });
			forceReflow(el);

			htmlEl.style.transition = `all ${durationMs}ms`;
			htmlEl.classList.add(`${baseClass}-out`);
			setTimeout(done, durationMs);
		},
	};
};

// 原版语义：进入与离开共用「目标幻灯片」解析出的同一个时长（durationMs），
// 不区分「进入用目标时长、离开用基础时长」。
export const getTransitionHandlers = (name: string, durationMs: number): VegasTransitionHandlers => {
	// 先过类型守卫再查表：TRANSITION_PRESETS 是普通对象，直接 `TRANSITION_PRESETS[name]`
	// 会沿原型链查到 `toString` / `constructor` 这类成员并把它当成预设，随后在读 `preset.to`
	// 时抛错。使用者登记一个叫这些名字的自定义过渡虽然少见，但完全合法。
	const preset = isVegasTransitionName(name) ? TRANSITION_PRESETS[name] : undefined;
	// resolveEffectName 已经保证 name 要么是内置预设名，要么是 register 登记过的
	// 自定义名——走到这里没有预设，就一定是后者，切到类模式
	if (!preset) return getCustomClassHandlers(name, durationMs);

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
