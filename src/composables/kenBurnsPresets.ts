const SCALE = 'var(--vegas-kenburns-scale)';
const TRANSLATE = 'var(--vegas-kenburns-translate)';
const NEG_TRANSLATE = 'calc(-1 * var(--vegas-kenburns-translate))';

// 逐字移植自原版 vegas.css。值为起始位移 [x, y]；null 表示只缩放不平移。
const KEN_BURNS_OFFSETS: Record<string, readonly [string, string] | null> = {
	kenburns: null,
	kenburnsUp: [ '0', TRANSLATE ],
	kenburnsDown: [ '0', NEG_TRANSLATE ],
	kenburnsLeft: [ TRANSLATE, '0' ],
	kenburnsRight: [ NEG_TRANSLATE, '0' ],
	kenburnsUpLeft: [ TRANSLATE, TRANSLATE ],
	kenburnsUpRight: [ NEG_TRANSLATE, TRANSLATE ],
	kenburnsDownLeft: [ TRANSLATE, NEG_TRANSLATE ],
	kenburnsDownRight: [ NEG_TRANSLATE, NEG_TRANSLATE ],
};

export const KEN_BURNS_NAMES: readonly string[] = Object.keys(KEN_BURNS_OFFSETS);

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
