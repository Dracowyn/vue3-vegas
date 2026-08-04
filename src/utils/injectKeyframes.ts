/** 标记属性，用于判断 keyframes 是否已注入 */
export const KEYFRAMES_STYLE_MARKER = 'data-vue3-vegas-keyframes';

/**
 * 幂等地把 keyframes 注入 document.head。
 * 同一页面多个 Vegas 实例共用一份，因此卸载时不移除。
 * 只允许在 onMounted 之后调用（SSR 环境下 document 不存在，直接跳过）。
 */
export const injectKeyframes = (css: string): void => {
	if (typeof document === 'undefined') return;
	if (document.head.querySelector(`style[${KEYFRAMES_STYLE_MARKER}]`)) return;

	const style = document.createElement('style');
	style.setAttribute(KEYFRAMES_STYLE_MARKER, '');
	style.textContent = css;
	document.head.appendChild(style);
};
