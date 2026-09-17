import { cssVar } from '../constants/cssVariables';
import { frozenKeys } from '../utils/frozenKeys';

const SCALE = cssVar('kenBurnsScale');
const TRANSLATE = cssVar('kenBurnsTranslate');
const NEG_TRANSLATE = `calc(-1 * ${cssVar('kenBurnsTranslate')})`;

// 逐字移植自原版 vegas.css。值为起始位移 [x, y]；null 表示只缩放不平移。
// 用 `satisfies` 而不是 `: Record<string, ...>` 标注，这样 key 保留字面量类型
// （唯一真相源），供下面 `VegasAnimationName` 派生。
const KEN_BURNS_OFFSETS = {
	kenburns: null,
	kenburnsUp: [ '0', TRANSLATE ],
	kenburnsDown: [ '0', NEG_TRANSLATE ],
	kenburnsLeft: [ TRANSLATE, '0' ],
	kenburnsRight: [ NEG_TRANSLATE, '0' ],
	kenburnsUpLeft: [ TRANSLATE, TRANSLATE ],
	kenburnsUpRight: [ NEG_TRANSLATE, TRANSLATE ],
	kenburnsDownLeft: [ TRANSLATE, NEG_TRANSLATE ],
	kenburnsDownRight: [ NEG_TRANSLATE, NEG_TRANSLATE ],
} satisfies Record<string, readonly [string, string] | null>;

/**
 * 内置 Ken Burns 动画名的精确字面量联合，从 `KEN_BURNS_OFFSETS` 的 key 推导——
 * 保持该表是唯一真相源，不手抄 9 个名字。
 */
export type VegasAnimationName = keyof typeof KEN_BURNS_OFFSETS;

// 对外公开的内置动画名单：内容与顺序取自 `KEN_BURNS_OFFSETS` 的 key。
export const KEN_BURNS_NAMES: readonly VegasAnimationName[] = frozenKeys(KEN_BURNS_OFFSETS);

/**
 * 判断一个任意字符串是不是内置 Ken Burns 动画名，并收窄成 `VegasAnimationName`。
 * 下游做白名单校验时的推荐入口——比「先把 `KEN_BURNS_NAMES` 赋给 `readonly string[]`
 * 局部变量再 `.includes`」更短，也不需要自己绕开 TS 对字面量联合数组 `.includes` 的限制。
 */
export const isVegasAnimationName = (name: string): name is VegasAnimationName => {
	// KEN_BURNS_NAMES 是精确字面量联合类型的数组，`.includes` 会把参数收窄成只接受该联合，
	// 这里要判断的是任意 string（未知是否内置），所以先放宽成 readonly string[] 再比较
	const names: readonly string[] = KEN_BURNS_NAMES;
	return names.includes(name);
};

/** CSS 动画名前缀，避免与页面上可能同时存在的原版 vegas.css 撞名 */
export const KEN_BURNS_ANIMATION_PREFIX = 'vue3-vegas-';

/**
 * 自定义动画（经 `animationRegister` 登记、不在内置 Ken Burns 名单里）靠 CSS 类生效时使用
 * 的类名前缀。媒体元素获得 `{PREFIX}{name}` 类并设置 `animationDuration`，keyframes 由使用者
 * 的 CSS 定义（对应原版 Vegas.js 的类名约定）。区别于内置动画走的行内 `animation` 简写。
 */
export const CUSTOM_ANIMATION_CLASS_PREFIX = 'vegas-animation-';

export const KEN_BURNS_KEYFRAMES_CSS: string = Object.entries(KEN_BURNS_OFFSETS)
	.map(([name, offset]) => {
		const fromTransform = offset === null
			? `scale(${SCALE})`
			: `scale(${SCALE}) translate(${offset[0]}, ${offset[1]})`;
		const toTransform = offset === null ? 'scale(1)' : 'scale(1) translate(0, 0)';

		return `@keyframes ${KEN_BURNS_ANIMATION_PREFIX}${name}{`
			+ `0%{transform:${fromTransform};}`
			+ `100%{transform:${toTransform};}`
			+ `}`;
	})
	.join('\n');
