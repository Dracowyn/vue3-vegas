export { default as Vegas } from './Vegas.vue';
export type {
	SlideProps,
	SlideVideo,
	SlideVideoConfig,
	VegasEffectName,
	VegasHandle,
	VegasPhase,
	VegasProps,
} from './types';
// 内置效果名单：下游做白名单校验、下拉选项等场景直接从包入口读取，不必深读 dist。
// 运行时数组已冻结，内容/顺序变化会被 tests/publicExports.test.ts 捕获。
// isVegasAnimationName / isVegasTransitionName 是同一份名单派生的类型守卫，比自己拿
// 名单做 `.includes` 校验更短，也自带类型收窄。
export { isVegasAnimationName, KEN_BURNS_NAMES } from './effects/kenBurnsPresets';
export type { VegasAnimationName } from './effects/kenBurnsPresets';
export { isVegasTransitionName, TRANSITION_NAMES } from './effects/transitionPresets';
export type { VegasTransitionName } from './effects/transitionPresets';
