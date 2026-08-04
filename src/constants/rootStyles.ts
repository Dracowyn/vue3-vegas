/** 根容器类名，仅供注入的样式表定位组件根节点使用，不属于公开 API */
export const VEGAS_ROOT_CLASS = 'vue3-vegas-root';

/**
 * 6 个效果调节变量的默认值。
 *
 * 必须写在注入的样式表里而不是行内 style：行内声明的优先级高于任何选择器，
 * 使用者就没法用自己的 CSS 覆盖了。外面再套一层 `:where()` 把特异度降到 0，
 * 这样使用者哪怕只用一个类名（甚至元素选择器）也能稳稳盖过默认值。
 */
export const VEGAS_ROOT_VARIABLES_CSS = `:where(.${VEGAS_ROOT_CLASS}){`
	+ '--vegas-kenburns-scale:1.5;'
	+ '--vegas-kenburns-translate:10%;'
	+ '--vegas-blur-value:32px;'
	+ '--vegas-swirl-degree:35deg;'
	+ '--vegas-swirl-scale:2;'
	+ '--vegas-zoom-scale:2;'
	+ '}';
