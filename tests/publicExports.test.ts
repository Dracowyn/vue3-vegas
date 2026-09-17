import { describe, expect, it } from 'vitest';
import { KEN_BURNS_NAMES, TRANSITION_NAMES } from '../src/index';
import { TRANSITION_PRESETS } from '../src/effects/transitionPresets';

// 内置过渡名与 Ken Burns 动画名是对外契约（下游拿它们做白名单），必须从包入口直接可读，
// 不能依赖深读 dist。这里把两份名单原样钉住，任何顺序/内容变化都要被测试捕获。
const EXPECTED_TRANSITION_NAMES = [
	'fade', 'fade2',
	'blur', 'blur2',
	'flash', 'flash2',
	'negative', 'negative2',
	'burn', 'burn2',
	'slideLeft', 'slideLeft2',
	'slideRight', 'slideRight2',
	'slideUp', 'slideUp2',
	'slideDown', 'slideDown2',
	'zoomIn', 'zoomIn2',
	'zoomOut', 'zoomOut2',
	'swirlLeft', 'swirlLeft2',
	'swirlRight', 'swirlRight2',
	'zoomInOut',
] as const;

const EXPECTED_KEN_BURNS_NAMES = [
	'kenburns',
	'kenburnsUp',
	'kenburnsDown',
	'kenburnsLeft',
	'kenburnsRight',
	'kenburnsUpLeft',
	'kenburnsUpRight',
	'kenburnsDownLeft',
	'kenburnsDownRight',
] as const;

describe('公开导出：内置效果名单', () => {
	it('TRANSITION_NAMES 精确匹配 27 个内置过渡名及其顺序', () => {
		expect(TRANSITION_NAMES).toHaveLength(27);
		expect([...TRANSITION_NAMES]).toEqual(EXPECTED_TRANSITION_NAMES);
	});

	it('KEN_BURNS_NAMES 精确匹配 9 个内置 Ken Burns 动画名及其顺序', () => {
		expect(KEN_BURNS_NAMES).toHaveLength(9);
		expect([...KEN_BURNS_NAMES]).toEqual(EXPECTED_KEN_BURNS_NAMES);
	});

	it('两份名单在运行时都已冻结，使用者无法修改', () => {
		expect(Object.isFrozen(TRANSITION_NAMES)).toBe(true);
		expect(Object.isFrozen(KEN_BURNS_NAMES)).toBe(true);
	});

	it('TRANSITION_NAMES 与 TRANSITION_PRESETS 的 key 集合一致', () => {
		expect(new Set(TRANSITION_NAMES)).toEqual(new Set(Object.keys(TRANSITION_PRESETS)));
	});

	// 类型层面的断言（VegasTransitionName / VegasAnimationName 的精确字面量联合、
	// VegasEffectName 的可导出性、readonly 数组的可赋值性、两个类型守卫的收窄）已经
	// 挪到 tests/publicExports.test-d.ts ——那个文件真的会被 vitest 的 typecheck
	// （vitest.config.ts 的 `test.typecheck`，用 vue-tsc + tests/tsconfig.json）处理，
	// 挪之前这里的 `expectTypeOf` 只是文档，不会被任何脚本强制执行。
});
