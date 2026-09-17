/**
 * 6 个效果调节用 CSS 自定义属性的名字与默认值，唯一真相源。
 *
 * 消费方（transitionPresets.ts / kenBurnsPresets.ts）一律通过 `cssVar()` 取用，
 * 生成 `var(--x, 默认值)` 形式的回退写法，而不是依赖注入到 `document.head`
 * 的默认值样式表——那种做法一旦注入失败（严格 CSP）或元素脱离作用域，
 * `transform` / `filter` 整条声明就会在计算值阶段直接失效。带内联回退值后，
 * 变量未被使用者设置时也总有值；使用者在根容器或任意祖先上设置同名变量
 * 时又能照常覆盖（回退值只在变量真正未定义时才生效）。
 */
export const VEGAS_CSS_VARIABLES = {
	kenBurnsScale: { name: '--vegas-kenburns-scale', default: '1.5' },
	kenBurnsTranslate: { name: '--vegas-kenburns-translate', default: '10%' },
	blurValue: { name: '--vegas-blur-value', default: '32px' },
	swirlDegree: { name: '--vegas-swirl-degree', default: '35deg' },
	swirlScale: { name: '--vegas-swirl-scale', default: '2' },
	zoomScale: { name: '--vegas-zoom-scale', default: '2' },
} as const;

export type VegasCssVariableKey = keyof typeof VEGAS_CSS_VARIABLES;

/** 生成带回退值的 `var()` 引用，例如 `cssVar('blurValue')` -> `'var(--vegas-blur-value, 32px)'` */
export const cssVar = (key: VegasCssVariableKey): string => {
	const { name, default: fallback } = VEGAS_CSS_VARIABLES[key];
	return `var(${name}, ${fallback})`;
};
