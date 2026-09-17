/**
 * 根容器类名。6 个效果调节变量不再靠注入样式表提供默认值（见
 * `constants/cssVariables.ts`），但这个类名仍然绑定在根元素上，方便使用者
 * 用 `.vue3-vegas-root { --vegas-xxx: ... }` 之类的选择器覆盖调节变量。
 */
export const VEGAS_ROOT_CLASS = 'vue3-vegas-root';
