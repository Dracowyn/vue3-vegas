import { cssVar } from '../constants/cssVariables';
import { frozenKeys } from '../utils/frozenKeys';

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
// 用 `satisfies` 而不是 `: Record<string, BasePreset>` 标注，这样 key 保留字面量类型
// （唯一真相源），供下面 `BaseTransitionName` / `VegasTransitionName` 派生。
const BASE_PRESETS = {
	fade: {
		from: { opacity: '0' },
		to: { opacity: '1' },
		out: { opacity: '0' },
	},
	blur: {
		from: { opacity: '0', filter: `blur(${cssVar('blurValue')}) brightness(1.01)` },
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
		out: { transform: `scale(${cssVar('zoomScale')})`, opacity: '0' },
	},
	zoomOut: {
		from: { transform: `scale(${cssVar('zoomScale')})`, opacity: '0' },
		to: { transform: 'scale(1)', opacity: '1' },
		out: { transform: 'scale(0)', opacity: '0' },
	},
	swirlLeft: {
		from: {
			transform: `scale(${cssVar('swirlScale')}) rotate(${cssVar('swirlDegree')})`,
			opacity: '0',
		},
		to: { transform: 'scale(1) rotate(0deg)', opacity: '1' },
		out: {
			transform: `scale(${cssVar('swirlScale')}) rotate(calc(-1 * ${cssVar('swirlDegree')}))`,
			opacity: '0',
		},
	},
	swirlRight: {
		from: {
			transform: `scale(${cssVar('swirlScale')}) rotate(calc(-1 * ${cssVar('swirlDegree')}))`,
			opacity: '0',
		},
		to: { transform: 'scale(1) rotate(0deg)', opacity: '1' },
		out: {
			transform: `scale(${cssVar('swirlScale')}) rotate(${cssVar('swirlDegree')})`,
			opacity: '0',
		},
	},
} satisfies Record<string, BasePreset>;

/** 13 个基础过渡名的精确字面量联合，从 `BASE_PRESETS` 的 key 推导 */
type BaseTransitionName = keyof typeof BASE_PRESETS;

export const BASE_TRANSITION_NAMES: readonly string[] = frozenKeys(BASE_PRESETS);

/**
 * 内置过渡名的精确字面量联合：13 个基础名各自派生 `X`(仅新图动) 与 `X2`(新旧图都动)，
 * 再加上 vue3-vegas 独有的 `zoomInOut`，共 27 个。用模板字面量类型从 `BASE_PRESETS`
 * 推导而不是手抄 27 个名字——保持基础预设表是唯一真相源，改预设表时类型自动同步。
 */
export type VegasTransitionName = BaseTransitionName | `${BaseTransitionName}2` | 'zoomInOut';

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

// 对外公开的内置过渡名单：内容与顺序由上面的构造逻辑决定，这里只是把 key 取出来。
// TRANSITION_PRESETS 为了能用 `Object.fromEntries` 动态拼装，类型标注成了宽泛的
// `Readonly<Record<string, TransitionPreset>>`（key 类型是 string），所以这里额外
// 用一次类型断言把 key 类型对齐回 `VegasTransitionName`——构造过程保证了 key 集合
// 与该联合类型完全一致，这是唯一在这份名单里出现的类型断言（frozenKeys 内部那次是
// 通用工具的实现细节，见其注释）。
export const TRANSITION_NAMES: readonly VegasTransitionName[] = frozenKeys(
	TRANSITION_PRESETS as Readonly<Record<VegasTransitionName, TransitionPreset>>
);

/**
 * 判断一个任意字符串是不是内置过渡名，并收窄成 `VegasTransitionName`。
 * 下游做白名单校验时的推荐入口——比「先把 `TRANSITION_NAMES` 赋给 `readonly string[]`
 * 局部变量再 `.includes`」更短，也不需要自己绕开 TS 对字面量联合数组 `.includes` 的限制。
 */
export const isVegasTransitionName = (name: string): name is VegasTransitionName => {
	// TRANSITION_NAMES 是精确字面量联合类型的数组，`.includes` 会把参数收窄成只接受该联合，
	// 这里要判断的是任意 string（未知是否内置），所以先放宽成 readonly string[] 再比较
	const names: readonly string[] = TRANSITION_NAMES;
	return names.includes(name);
};

/**
 * 自定义过渡（经 `transitionRegister` 登记、没有内置预设的名字）靠 CSS 类生效时使用的类名前缀。
 * 入场元素依次获得 `{PREFIX}{name}` 与 `{PREFIX}{name}-in`，离场元素获得 `{PREFIX}{name}-out`，
 * 初始态/目标态/离场态样式全部由使用者的 CSS 定义（逐字对应原版 Vegas.js 的类名约定）。
 */
export const CUSTOM_TRANSITION_CLASS_PREFIX = 'vegas-transition-';
