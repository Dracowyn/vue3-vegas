import { expectTypeOf, test } from 'vitest';
import {
	KEN_BURNS_NAMES,
	TRANSITION_NAMES,
	isVegasAnimationName,
	isVegasTransitionName,
	type VegasAnimationName,
	type VegasEffectName,
	type VegasProps,
	type VegasTransitionName,
} from '../src/index';

// 这个文件是唯一真正被类型检查器（vue-tsc，见 tests/tsconfig.json + vitest.config.ts 的
// `test.typecheck`）处理的地方——运行时断言留在 tests/publicExports.test.ts。

test('VegasTransitionName 是内置过渡名的精确字面量联合', () => {
	expectTypeOf<'fade'>().toMatchTypeOf<VegasTransitionName>();
	expectTypeOf<'fade2'>().toMatchTypeOf<VegasTransitionName>();
	expectTypeOf<'zoomInOut'>().toMatchTypeOf<VegasTransitionName>();
	expectTypeOf<'notARealTransition'>().not.toMatchTypeOf<VegasTransitionName>();
});

test('isVegasTransitionName / isVegasAnimationName 收窄任意 string', () => {
	const name: string = 'fade';
	if (isVegasTransitionName(name)) {
		expectTypeOf(name).toEqualTypeOf<VegasTransitionName>();
	}

	const animationName: string = 'kenburns';
	if (isVegasAnimationName(animationName)) {
		expectTypeOf(animationName).toEqualTypeOf<VegasAnimationName>();
	}
});

test('VegasEffectName 类型可从包入口直接导入使用', () => {
	const requested: VegasEffectName<VegasTransitionName> = 'random';
	expectTypeOf(requested).toMatchTypeOf<string>();
});

test('transition / animation 的数组分支接受只读数组、as const 元组、可变数组与单值', () => {
	// TRANSITION_NAMES / KEN_BURNS_NAMES 是冻结的 readonly 数组，最自然的用法必须合法
	const withFrozenTransition: VegasProps = { slides: [], transition: TRANSITION_NAMES };
	const withFrozenAnimation: VegasProps = { slides: [], animation: KEN_BURNS_NAMES };

	// as const 元组
	const withTuple: VegasProps = { slides: [], transition: ['fade', 'blur'] as const };

	// 显式 readonly string[]
	const readonlyPool: readonly string[] = ['fade', 'blur'];
	const withReadonlyArray: VegasProps = { slides: [], transition: readonlyPool };

	// 可变数组仍然合法（不应因为收紧成 readonly 而拒绝可变数组）
	const mutablePool: string[] = ['fade', 'blur'];
	const withMutableArray: VegasProps = { slides: [], transition: mutablePool };

	// 普通 string 变量与 null（animation 支持 null）
	const single: string = 'fade';
	const withString: VegasProps = { slides: [], transition: single };
	const withNullAnimation: VegasProps = { slides: [], animation: null };

	expectTypeOf(withFrozenTransition).toMatchTypeOf<VegasProps>();
	expectTypeOf(withFrozenAnimation).toMatchTypeOf<VegasProps>();
	expectTypeOf(withTuple).toMatchTypeOf<VegasProps>();
	expectTypeOf(withReadonlyArray).toMatchTypeOf<VegasProps>();
	expectTypeOf(withMutableArray).toMatchTypeOf<VegasProps>();
	expectTypeOf(withString).toMatchTypeOf<VegasProps>();
	expectTypeOf(withNullAnimation).toMatchTypeOf<VegasProps>();
});

test('transition 仍然拒绝非法类型（数字）', () => {
	// @ts-expect-error 数字不是合法的效果名
	const bad: VegasProps = { slides: [], transition: 123 };
	expectTypeOf(bad).toMatchTypeOf<VegasProps>();
});
