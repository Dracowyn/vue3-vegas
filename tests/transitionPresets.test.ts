import { describe, expect, it } from 'vitest';
import {
	BASE_TRANSITION_NAMES,
	TRANSITION_NAMES,
	TRANSITION_PRESETS,
} from '../src/effects/transitionPresets';

describe('transitionPresets', () => {
	it('covers the 13 base transitions from vegas.css', () => {
		expect([...BASE_TRANSITION_NAMES]).toEqual([
			'fade', 'blur', 'flash', 'negative', 'burn',
			'slideLeft', 'slideRight', 'slideUp', 'slideDown',
			'zoomIn', 'zoomOut', 'swirlLeft', 'swirlRight',
		]);
	});

	it('derives 26 原版名字 plus the zoomInOut extension', () => {
		expect(TRANSITION_NAMES).toHaveLength(27);
		expect(TRANSITION_NAMES).toContain('zoomInOut');
		for (const base of BASE_TRANSITION_NAMES) {
			expect(TRANSITION_NAMES).toContain(base);
			expect(TRANSITION_NAMES).toContain(`${base}2`);
		}
	});

	it('gives only the `2` variants an out state', () => {
		for (const base of BASE_TRANSITION_NAMES) {
			expect(TRANSITION_PRESETS[base].out).toBeUndefined();
			expect(TRANSITION_PRESETS[`${base}2`].out).toBeDefined();
		}
	});

	it('shares from/to between a base transition and its `2` variant', () => {
		for (const base of BASE_TRANSITION_NAMES) {
			expect(TRANSITION_PRESETS[`${base}2`].from).toEqual(TRANSITION_PRESETS[base].from);
			expect(TRANSITION_PRESETS[`${base}2`].to).toEqual(TRANSITION_PRESETS[base].to);
		}
	});

	it('matches vegas.css values for fade', () => {
		expect(TRANSITION_PRESETS.fade).toEqual({ from: { opacity: '0' }, to: { opacity: '1' } });
		expect(TRANSITION_PRESETS.fade2.out).toEqual({ opacity: '0' });
	});

	it('matches vegas.css values for zoomIn / zoomOut', () => {
		expect(TRANSITION_PRESETS.zoomIn.from).toEqual({ transform: 'scale(0)', opacity: '0' });
		expect(TRANSITION_PRESETS.zoomIn.to).toEqual({ transform: 'scale(1)', opacity: '1' });
		expect(TRANSITION_PRESETS.zoomIn2.out).toEqual({
			transform: 'scale(var(--vegas-zoom-scale, 2))',
			opacity: '0',
		});
		expect(TRANSITION_PRESETS.zoomOut.from).toEqual({
			transform: 'scale(var(--vegas-zoom-scale, 2))',
			opacity: '0',
		});
		expect(TRANSITION_PRESETS.zoomOut2.out).toEqual({ transform: 'scale(0)', opacity: '0' });
	});

	it('matches vegas.css values for swirlLeft', () => {
		expect(TRANSITION_PRESETS.swirlLeft.from).toEqual({
			transform: 'scale(var(--vegas-swirl-scale, 2)) rotate(var(--vegas-swirl-degree, 35deg))',
			opacity: '0',
		});
		expect(TRANSITION_PRESETS.swirlLeft2.out).toEqual({
			transform: 'scale(var(--vegas-swirl-scale, 2)) '
				+ 'rotate(calc(-1 * var(--vegas-swirl-degree, 35deg)))',
			opacity: '0',
		});
	});

	it('keeps zoomInOut bidirectional as a vue3-vegas extension', () => {
		expect(TRANSITION_PRESETS.zoomInOut).toEqual({
			from: { transform: 'scale(1)', opacity: '0' },
			to: { transform: 'scale(1.25)', opacity: '1' },
			out: { transform: 'scale(1)', opacity: '0' },
		});
	});

	it('gives every `var(--vegas-*)` reference in the presets its own fallback value', () => {
		const serialized = JSON.stringify(TRANSITION_PRESETS);
		// 不带回退值的写法：`var(--vegas-xxx)`，逗号回退写法不应命中
		const bareVarUsages = serialized.match(/var\(--vegas-[a-z-]+\)/g);
		expect(bareVarUsages).toBeNull();
	});
});
