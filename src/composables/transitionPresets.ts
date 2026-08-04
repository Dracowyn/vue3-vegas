export interface TransitionPreset {
	/** 新幻灯片进入前的初始样式 */
	from: Record<string, string>;
	/** 新幻灯片进入后的目标样式 */
	to: Record<string, string>;
	/** 仅 `X2` 变体有：旧幻灯片离场的目标样式。缺省表示旧图不参与动画 */
	out?: Record<string, string>;
}

type BasePreset = Required<TransitionPreset>;

// 逐字移植自原版 vegas.css。13 种基础效果，每种派生出 `X`(仅新图动) 与 `X2`(新旧图都动)。
const BASE_PRESETS: Record<string, BasePreset> = {
	fade: {
		from: { opacity: '0' },
		to: { opacity: '1' },
		out: { opacity: '0' },
	},
	blur: {
		from: { opacity: '0', filter: 'blur(var(--vegas-blur-value)) brightness(1.01)' },
		to: { opacity: '1', filter: 'blur(0px) brightness(1.01)' },
		out: { opacity: '0' },
	},
	flash: {
		from: { opacity: '0', filter: 'brightness(25)' },
		to: { opacity: '1', filter: 'brightness(1)' },
		out: { opacity: '0', filter: 'brightness(25)' },
	},
	negative: {
		from: { opacity: '0', filter: 'invert(100%)' },
		to: { opacity: '1', filter: 'invert(0)' },
		out: { opacity: '0', filter: 'invert(100%)' },
	},
	burn: {
		from: { opacity: '0', filter: 'contrast(1000%) saturate(1000%)' },
		to: { opacity: '1', filter: 'contrast(100%) saturate(100%)' },
		out: { opacity: '0', filter: 'contrast(1000%) saturate(1000%)' },
	},
	slideLeft: {
		from: { transform: 'translateX(100%)' },
		to: { transform: 'translateX(0%)' },
		out: { transform: 'translateX(-100%)' },
	},
	slideRight: {
		from: { transform: 'translateX(-100%)' },
		to: { transform: 'translateX(0%)' },
		out: { transform: 'translateX(100%)' },
	},
	slideUp: {
		from: { transform: 'translateY(100%)' },
		to: { transform: 'translateY(0%)' },
		out: { transform: 'translateY(-100%)' },
	},
	slideDown: {
		from: { transform: 'translateY(-100%)' },
		to: { transform: 'translateY(0%)' },
		out: { transform: 'translateY(100%)' },
	},
	zoomIn: {
		from: { transform: 'scale(0)', opacity: '0' },
		to: { transform: 'scale(1)', opacity: '1' },
		out: { transform: 'scale(var(--vegas-zoom-scale))', opacity: '0' },
	},
	zoomOut: {
		from: { transform: 'scale(var(--vegas-zoom-scale))', opacity: '0' },
		to: { transform: 'scale(1)', opacity: '1' },
		out: { transform: 'scale(0)', opacity: '0' },
	},
	swirlLeft: {
		from: {
			transform: 'scale(var(--vegas-swirl-scale)) rotate(var(--vegas-swirl-degree))',
			opacity: '0',
		},
		to: { transform: 'scale(1) rotate(0deg)', opacity: '1' },
		out: {
			transform: 'scale(var(--vegas-swirl-scale)) rotate(calc(-1 * var(--vegas-swirl-degree)))',
			opacity: '0',
		},
	},
	swirlRight: {
		from: {
			transform: 'scale(var(--vegas-swirl-scale)) rotate(calc(-1 * var(--vegas-swirl-degree)))',
			opacity: '0',
		},
		to: { transform: 'scale(1) rotate(0deg)', opacity: '1' },
		out: {
			transform: 'scale(var(--vegas-swirl-scale)) rotate(var(--vegas-swirl-degree))',
			opacity: '0',
		},
	},
};

export const BASE_TRANSITION_NAMES: readonly string[] = Object.keys(BASE_PRESETS);

export const TRANSITION_PRESETS: Readonly<Record<string, TransitionPreset>> = Object.freeze({
	...Object.fromEntries(
		Object.entries(BASE_PRESETS).flatMap(([name, { from, to, out }]) => [
			// `X`：只有新图做动画，旧图原地等待移除
			[name, { from, to }],
			// `X2`：新图进入的同时旧图离场
			[`${name}2`, { from, to, out }],
		])
	),
	// vue3-vegas 自有扩展，非原版效果：进入后持续缓慢放大
	zoomInOut: {
		from: { transform: 'scale(1)', opacity: '0' },
		to: { transform: 'scale(1.25)', opacity: '1' },
		out: { transform: 'scale(1)', opacity: '0' },
	},
});

export const TRANSITION_NAMES: readonly string[] = Object.keys(TRANSITION_PRESETS);
