/** 标记属性，用于判断 keyframes 是否已注入 */
export const KEYFRAMES_STYLE_MARKER = 'data-vue3-vegas-keyframes';

/** 标记属性，用于判断根容器的默认 CSS 变量是否已注入 */
export const ROOT_STYLE_MARKER = 'data-vue3-vegas-root';

/**
 * 幂等地把一段 CSS 注入 document.head，用 marker 属性去重。
 * 同一页面多个 Vegas 实例共用一份，因此卸载时不移除。
 * 只允许在 onMounted 之后调用（SSR 环境下 document 不存在，直接跳过）。
 */
const injectStyleOnce = (css: string, marker: string): void => {
	if (typeof document === 'undefined') return;
	if (document.head.querySelector(`style[${marker}]`)) return;

	const style = document.createElement('style');
	style.setAttribute(marker, '');
	style.textContent = css;
	document.head.appendChild(style);
};

/** 注入 Ken Burns 的 @keyframes */
export const injectKeyframes = (css: string): void =>
	injectStyleOnce(css, KEYFRAMES_STYLE_MARKER);

/** 注入根容器上的效果调节 CSS 变量默认值 */
export const injectRootStyles = (css: string): void =>
	injectStyleOnce(css, ROOT_STYLE_MARKER);
