import { describe, expect, it } from 'vitest';
import { cssVar, VEGAS_CSS_VARIABLES } from '../src/constants/cssVariables';

describe('cssVariables', () => {
	it('declares the 6 tuning variables with their upstream default values', () => {
		expect(VEGAS_CSS_VARIABLES.kenBurnsScale).toEqual({
			name: '--vegas-kenburns-scale',
			default: '1.5',
		});
		expect(VEGAS_CSS_VARIABLES.kenBurnsTranslate).toEqual({
			name: '--vegas-kenburns-translate',
			default: '10%',
		});
		expect(VEGAS_CSS_VARIABLES.blurValue).toEqual({
			name: '--vegas-blur-value',
			default: '32px',
		});
		expect(VEGAS_CSS_VARIABLES.swirlDegree).toEqual({
			name: '--vegas-swirl-degree',
			default: '35deg',
		});
		expect(VEGAS_CSS_VARIABLES.swirlScale).toEqual({
			name: '--vegas-swirl-scale',
			default: '2',
		});
		expect(VEGAS_CSS_VARIABLES.zoomScale).toEqual({
			name: '--vegas-zoom-scale',
			default: '2',
		});
	});

	it('builds a var() reference carrying its own fallback value', () => {
		expect(cssVar('blurValue')).toBe('var(--vegas-blur-value, 32px)');
		expect(cssVar('kenBurnsScale')).toBe('var(--vegas-kenburns-scale, 1.5)');
		expect(cssVar('swirlDegree')).toBe('var(--vegas-swirl-degree, 35deg)');
	});
});
